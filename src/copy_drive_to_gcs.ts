import { Storage } from "@google-cloud/storage";
import type { OAuth2Client } from "google-auth-library";
import { type drive_v3, google } from "googleapis";
import { Readable } from "node:stream";
import dotenv from "dotenv";
dotenv.config();

const shareDriveId = process.env.SHARE_DRIVE_ID ?? "";
const folderId = process.env.FOLDER_ID ?? "";
const bucketName = process.env.GCS_BUCKET_NAME ?? "";
const dryRun = process.env.DRY_RUN === "true";
console.log(
  `shareDriveId: ${shareDriveId}, folderId: ${folderId}, bucketName: ${bucketName}`
);

const run = async () => {
  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const storage = new Storage({ authClient: auth });

  const ite = listFiles({ folderId, shareDriveId, drive });

  // loop ite
  for await (const file of ite) {
    console.log(file);
    if (file.id) {
      await copyDocumentToGCSAsMarkdown({
        documentId: file.id,
        bucketName,
        auth,
        drive,
        storage,
      });
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

const copyDocumentToGCSAsMarkdown = async ({
  documentId,
  bucketName,
  drive,
  storage,
}: {
  documentId: string;
  bucketName: string;
  auth: OAuth2Client;
  drive: drive_v3.Drive;
  storage: Storage;
}) => {
  try {
    const document = await drive.files.get({
      fileId: documentId,
      fields: "id,name,modifiedTime",
      supportsAllDrives: true,
    });
    const filename = `${document.data.id}.md`;
    // GCS のバケットとファイルを指定します。
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(filename);

    const [existsInGcs] = await blob.exists();

    if (
      existsInGcs &&
      new Date(document.data.modifiedTime ?? 0) <
        new Date(blob.metadata.updated ?? 0)
    ) {
      console.log(`Skip: ${document.data.name} is not updated`);
      return;
    }
    console.log(
      `Copying File:${document.data.name} to ${bucketName}/${filename}`
    );
    // DryRunの場合、ファイルのコピーをスキップします。
    if (dryRun) {
      return;
    }
    // Drive からファイルをダウンロードするためのストリームを作成します。
    const driveFileStream = await drive.files.export(
      { fileId: documentId, mimeType: "text/markdown" },
      { responseType: "stream" }
    );

    await blob.save(driveFileStream.data);
  } catch (err) {
    console.error("ファイルのコピー中にエラーが発生しました:", err);
  }
};

// Googleドライブのフォルダの中のGoogleドキュメントを列挙する
async function* listFiles({
  folderId,
  shareDriveId,
  drive,
}: {
  folderId: string;
  shareDriveId: string;
  drive: drive_v3.Drive;
}): AsyncGenerator<drive_v3.Schema$File> {
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
          yield* await listFiles({ folderId: folder.id, shareDriveId, drive });
        }
      }
    }
  } catch (err) {
    console.error("ファイルの取得中にエラーが発生しました:", err);
    throw err;
  }
}

run();
