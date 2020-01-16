const http = require('http')
const path = require('path')
const fse = require('fs-extra')
const multiparty = require("multiparty")

const UPLOAD_DIR = path.resolve(__dirname, '..', '_upload')

const server = http.createServer()

// 获取文件扩展名
const extractExt = filename =>
  filename.slice(filename.lastIndexOf("."), filename.length); // 提取后缀名

// 返回已经上传切片名
const createUploadedList = async fileHash =>
  fse.existsSync(`${UPLOAD_DIR}/${fileHash}`)
    ? await fse.readdir(`${UPLOAD_DIR}/${fileHash}`)
    : [];

// 处理POST请求
const resolvePost = req =>
  new Promise(resolve => {
    let chunk = "";
    req.on("data", data => {
      chunk += data;
    });

    req.on("end", () => {
      resolve(JSON.parse(chunk));
    });
  });

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
  
  // 验证文件是否需要上传
  if (req.url === "/verify") {
    await handleVerify(req, res)
  }
  
  // 上传操作
  if (req.url === '/upload') {
    await handleUpload(req, res)
  }
})

server.listen(3000, () => console.log('服务端已启动 http://localhost:3000'))

// 验证的处理
async function handleVerify(req, res) {
  const data = await resolvePost(req);
  const { fileHash, filename } = data;
  const ext = extractExt(filename);
  const filePath = `${UPLOAD_DIR}/${fileHash}${ext}`;
  if (fse.existsSync(filePath)) {
    // 文件已上传并已经合并，不需要上传
    res.end(
      JSON.stringify({
        shouldUpload: false
      })
    );
  } else {
    // 文件切片部分上传或未上传
    res.end(
      JSON.stringify({
        shouldUpload: true,
        uploadedList: await createUploadedList(fileHash)
      })
    );
  }
}

// 上传操作
async function handleUpload(req, res) {
  const multipart = new multiparty.Form();

  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      res.status = 500;
      res.end(`接受文件失败: ${err}`);
      return;
    }

    const [chunk] = files.chunk;
    const [filehash] = fields.filehash;
    const [chunkhash] = fields.chunkhash;
    const filePath = `${UPLOAD_DIR}/${filehash}/${chunkhash}`;
    const chunkDir = `${UPLOAD_DIR}/${filehash}`;
  
    // 文件已存在
    if (fse.existsSync(`${filePath}`)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end("切片已存在，不需要重复上传");
      await applyMerge(fields)
      return
    }

    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir);
    }

    await fse.move(chunk.path, `${filePath}`);
    
    await applyMerge(fields)
    
    res.end("接收文件成功");
  });
}

async function applyMerge(fields) {
  const [filehash] = fields.filehash;
  const [length] = fields.length
  const chunkDir = `${UPLOAD_DIR}/${filehash}`;
  
  let chunkPaths = fse.readdirSync(chunkDir);
  if (chunkPaths.length === Number(length)) {
    await handleMerge(fields)
  }
}

// 合并的处理
async function handleMerge(fields) {
  const [filehash] = fields.filehash;
  const [filename] = fields.filename;
  
  const ext = extractExt(filename);
  
  const filePath = `${UPLOAD_DIR}/${filehash}${ext}`;
  const chunkDir = `${UPLOAD_DIR}/${filehash}`;
  let chunkPaths = fse.readdirSync(chunkDir);

  // 文件排序
  chunkPaths.sort((a, b) => {
    let numA = Number(a.slice(a.lastIndexOf('-') + 1, a.length))
    let numB = Number(b.slice(b.lastIndexOf('-') + 1, b.length))
    return numA - numB
  })

  fse.writeFileSync(filePath, "");
  chunkPaths.forEach(chunkPath => {
    fse.appendFileSync(filePath, fse.readFileSync(`${chunkDir}/${chunkPath}`));
    fse.unlinkSync(`${chunkDir}/${chunkPath}`); // 删除文件
  });
  fse.rmdirSync(chunkDir); // 合并后删除保存切片的目录
}
