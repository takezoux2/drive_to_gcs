import { google } from "googleapis";
import express from "express";
import fs from "node:fs";

const app = express();

const getAuth2Token = async () => {
  const credentials = require("../secrets/credentials.json");
  const oauth2Client = new google.auth.OAuth2({
    clientId: credentials.installed.client_id,
    clientSecret: credentials.installed.client_secret,
    redirectUri: "http://localhost:3000/oauth2callback",
  });

  app.get("/", (req, res) => {
    res.send(
      `<html><body><a href="/auth/google">Google 認証</a></body></html>`
    );
  });

  // 認可 URL を生成
  app.get("/auth/google", (req, res) => {
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/devstorage.read_write",
      ],
    });
    res.redirect(authorizeUrl);
  });

  // コールバック URL で認可コードを受け取る
  app.get("/oauth2callback", async (req, res) => {
    const code = req.query.code as string;

    try {
      // 認可コードをアクセストークンと交換
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // アクセストークンを取得
      const accessToken = tokens.access_token;
      console.log(accessToken);

      // save token\
      fs.writeFileSync("./secrets/token.json", JSON.stringify(tokens));

      res.send(`<html><body>認証に成功しました！<br />
        secrets/token.jsonに保存しました。<br />
        ${JSON.stringify(tokens)}</body></html>
        `);
    } catch (err) {
      console.error("エラー:", err);
      res.status(500).send("認証に失敗しました。");
    }
  });

  app.listen(3000, () => {
    console.log("サーバーがポート 3000 で起動しました。");
  });
};

getAuth2Token();
