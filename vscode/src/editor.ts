import * as crypto from "crypto";
import * as path from "path";

import * as cheerio from "cheerio";
// import * as Diff from "diff";
import fetch from "node-fetch";
import * as vscode from "vscode";

const DEV_HOST = "localhost:3000";
const DEV_ORIGIN = "http://" + DEV_HOST;

const VIEW_TYPE = "tofu";

const getNonce = () => crypto.randomBytes(16).toString("hex");

export class EditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new EditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      VIEW_TYPE,
      provider
    );
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  private async getHTMLForWebview(webview: vscode.Webview): Promise<string> {
    const { fs } = vscode.workspace;
    const basePath = path.join(this.context.extensionPath, "..", "build");
    try {
      const html = await fetch(DEV_ORIGIN).then((req) => req.text());
      const $ = cheerio.load(html);

      const nonces: string[] = [getNonce()];
      $("script").each((i, el) => {
        const $el = $(el);
        const src = $el.attr("src");
        if (!src) {
          return;
        }

        $el.attr(
          "src",
          DEV_ORIGIN + src ||
            webview
              .asWebviewUri(vscode.Uri.file(path.join(basePath, src)))
              .toString()
        );
        const nonce = getNonce();
        $el.attr("nonce", nonce);
        nonces.push(nonce);
      });

      const cspContent = [
        `script-src ${nonces.map((nonce) => `'nonce-${nonce}'`).join(" ")}`,
        `worker-src blob: ${DEV_ORIGIN}`,
      ]
        .map((s) => s + ";")
        .join(" ");

      $("head").prepend(
        `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`,
        `<script nonce="${nonces[0]}">
          const _WebSocket = window.WebSocket;
          window.WebSocket = function(url, ...args) {
            return new _WebSocket("ws://${DEV_HOST}/sockjs-node", ...args)
          }
        </script>`
      );
      return $.html();
    } catch (e) {
      console.error(e);
    }

    const htmlBuffer = await fs.readFile(
      vscode.Uri.file(path.join(basePath, "index.html"))
    );
    return htmlBuffer.toString();
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = await this.getHTMLForWebview(
      webviewPanel.webview
    );

    let pendingEdit = false;

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: "update",
        source: document.getText(),
      });
    }

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (
          e.contentChanges.length > 0 &&
          !pendingEdit &&
          e.document.uri.toString() === document.uri.toString()
        ) {
          updateWebview();
        }
        pendingEdit = false;
      }
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "ready": {
          updateWebview();
          break;
        }

        case "update": {
          pendingEdit = true;
          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            message.source
          );
          // console.log(
          //   JSON.stringify(
          //     Diff.diffChars(document.getText(), message.source),
          //     null,
          //     2
          //   )
          // );
          vscode.workspace.applyEdit(edit);
          break;
        }
      }
    });
  }
}
