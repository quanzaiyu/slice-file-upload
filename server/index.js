const http = require('http')
const path = require('path')
const fse = require('fs-extra')
const multiparty = require("multiparty")

const UPLOAD_DIR = path.resolve(__dirname, '..', '_upload')

const server = http.createServer()

server.on('request', async (req, res) => {
  // 跨域设置
  res.setHeader("Access-Control-Allow-Origin","*")
  res.setHeader("Access-Control-Allow-Headers", "*")
  res.setHeader("Access-Control-Allow-Methods","DELETE,PUT,POST,GET,OPTIONS")
  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  if (req.method === "OPTIONS") {
    res.status = 200
    res.end()
    return
  }

  if (req.url === '/upload') {
    await handleUpload(req, res)
  }
})

server.listen(3000, () => console.log('服务端已启动 http://localhost:3000'))

async function handleUpload(req, res) {

  const multipart = new multiparty.Form();

  multipart.parse(req, async (err, fields, files) => {
    console.log({err, fields, files})

    if (err) {
      res.status = 500;
      res.end(`接受文件失败: ${err}`);
      return;
    }

    const [file] = files.file;
    const [filename] = fields.filename;
    const fileDir = `${UPLOAD_DIR}/${filename}`;
    const filePath = `${UPLOAD_DIR}/${filename}/${filename}`;

    if (!fse.existsSync(fileDir)) {
      await fse.mkdirs(fileDir);
    }

    await fse.move(file.path, `${filePath}`);
    res.end("接收文件成功");
  });
}
