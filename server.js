const { createServer } = require('http')
const next = require('next')

const dev = false
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      await handle(req, res)
    } catch (err) {
      console.error(err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  }).listen(port, hostname, () => {
    console.log(`Sunder Computers running on port ${port}`)
  })
})