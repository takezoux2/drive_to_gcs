import { WebClient } from "@slack/web-api";
import fs from "node:fs";
import { Writable } from "node:stream";
import dotenv from "dotenv";
dotenv.config();

// get first arg
const channelId = process.argv[2] ?? process.env.CHANNEL_ID;

const prepareContext = () => {
  const BOT_USER_OAUTH_TOKEN = process.env.BOT_USER_OAUTH_TOKEN;
  const web = new WebClient(BOT_USER_OAUTH_TOKEN);
  const files = fs.readdirSync("download");
  return { client: web, token: BOT_USER_OAUTH_TOKEN, files };
};
type Context = ReturnType<typeof prepareContext>;

const copySlackToLocal = async (fileId: string, context: Context) => {
  const web = context.client;

  if (context.files.some((file) => file.startsWith(fileId))) {
    console.log(`File ${fileId} is already downloaded`);
    return;
  }

  const info = await web.files.info({
    file: fileId,
  });
  const downloadUrl = info.file?.url_private_download;
  if (!downloadUrl) {
    console.log(`File ${fileId} is not downloadable`);
    return;
  }
  console.log(`Download URL: ${downloadUrl}`);
  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${context.token}`,
    },
  });
  const writeStream = Writable.toWeb(
    fs.createWriteStream(`download/${fileId}_${info.file?.name}`)
  );
  response.body?.pipeTo(writeStream);
};

const downloadAllFilesInChannel = async (
  channelId: string,
  context: Context
) => {
  console.log("Download all files in channel", channelId);
  const web = context.client;
  const files = await web.files.list({
    channel: channelId,
  });

  for (const file of files.files ?? []) {
    if (!file.id) {
      continue;
    }
    await copySlackToLocal(file.id, context);
  }
};

if (!channelId) {
  console.error(
    "Usage: download_slack_files_to_local.ts <channel_id> or set env.CHANNEL_ID"
  );
  process.exit(1);
}
downloadAllFilesInChannel(channelId, prepareContext());

// filesでファイルの列挙時のフィールドのサンプル

/*
{
      id: 'F0838JEQFD0',
      created: 1733146361,
      timestamp: 1733146361,
      name: 'みやこメッセ_請求書.pdf',
      title: 'みやこメッセ_請求書.pdf',
      mimetype: 'application/pdf',
      filetype: 'pdf',
      pretty_type: 'PDF',
      user: 'U05S5GBRSSV',
      user_team: 'T05RL89L46A',
      editable: false,
      size: 219865,
      mode: 'hosted',
      is_external: false,
      external_type: '',
      is_public: true,
      public_url_shared: false,
      display_as_bot: false,
      username: '',
      url_private: 'https://files.slack.com/files-pri/T05RL89L46A-F0838JEQFD0/____________________________.pdf',
      url_private_download: 'https://files.slack.com/files-pri/T05RL89L46A-F0838JEQFD0/download/____________________________.pdf',
      media_display_type: 'unknown',
      thumb_pdf: 'https://files.slack.com/files-tmb/T05RL89L46A-F0838JEQFD0-3e2ab55d92/_____________________________thumb_pdf.png',
      thumb_pdf_w: 909,
      thumb_pdf_h: 1285,
      permalink: 'https://tskaigi.slack.com/files/U05S5GBRSSV/F0838JEQFD0/____________________________.pdf',
      permalink_public: 'https://slack-files.com/T05RL89L46A-F0838JEQFD0-30a3dc4daf',
      channels: [Array],
      groups: [],
      ims: [],
      comments_count: 0
    }
*/
