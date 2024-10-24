import { Storage } from "@google-cloud/storage";
import type { OAuth2Client } from "google-auth-library";
import { type drive_v3, google } from "googleapis";
import { Readable } from "node:stream";

const shareDriveId = process.env.SHARE_DRIVE_ID ?? "";
const folderId = process.env.FOLDER_ID ?? "";
const bucketName = process.env.BUCKET_NAME ?? "";

const run = async () => {
  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  const ite = listFiles(folderId, shareDriveId, drive, auth);

  // loop ite
  for await (const file of ite) {
    console.log(file);
    if (file.id) {
      await copyDocumentToGCSAsMarkdown(file.id, bucketName, auth);
    }
  }
};

const getAuthClient = async () => {
  const token = require("../secrets/token.json");
  const credentials = require("../secrets/credentials.json");
  const auth = new google.auth.OAuth2(
    credentials.installed.client_id,
    credentials.installed.client_secret
  );
  auth.setCredentials(token);
  await auth.refreshAccessToken();
  return auth;
};

const copyDocumentToGCSAsMarkdown = async (
  documentId: string,
  bucketName: string,
  auth: OAuth2Client
) => {
  const drive = google.drive({ version: "v3", auth });
  const storage = new Storage({ authClient: auth });

  try {
    const document = await drive.files.get({
      fileId: documentId,
      fields: "id,name",
      supportsAllDrives: true,
      // driveId: "0AFWfZVJiXutxUk9PVA",
    });
    const filename = `${document.data.id}.md`;

    // Drive からファイルをダウンロードするためのストリームを作成します。
    const driveFileStream = await drive.files.export(
      { fileId: documentId, mimeType: "text/markdown" },
      { responseType: "stream" }
    );

    // GCS のバケットとファイルを指定します。
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(filename);
    console.log(
      `Copying File:${document.data.name} to ${bucketName}/${filename}`
    );
    await blob.save(driveFileStream.data);
  } catch (err) {
    console.error("ファイルのコピー中にエラーが発生しました:", err);
  }
};

// Googleドライブのフォルダの中のGoogleドキュメントを列挙する
async function* listFiles(
  folderId: string,
  shareDriveId: string,
  drive: drive_v3.Drive,
  auth: OAuth2Client
): AsyncGenerator<drive_v3.Schema$File> {
  console.log(`Folder: ${folderId}`);

  try {
    const res = await drive.files.list({
      corpora: "drive",
      driveId: shareDriveId,
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document'`,
      fields: "files(id, name, mimeType)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    if (res.data.files) {
      for (const file of res.data.files) {
        yield file;
      }
    }

    // フォルダ内のフォルダを取得
    const folders = await drive.files.list({
      corpora: "drive",
      driveId: shareDriveId,
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name, mimeType)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    if (folders.data.files) {
      // 各フォルダに対して再帰的に処理を行う
      for (const folder of folders.data.files) {
        console.log(`Folder: ${folder.name}`);
        if (folder.id) {
          yield* await listFiles(folder.id, shareDriveId, drive, auth);
        }
      }
    }
  } catch (err) {
    console.error("ファイルの取得中にエラーが発生しました:", err);
    throw err;
  }
}

run();
