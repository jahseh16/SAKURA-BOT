const fs = require('fs')

class JSONFile {
  constructor(filename) {
    this.filename = filename
  }

  read() {
    try {
      const data = fs.readFileSync(this.filename, 'utf8')
      return JSON.parse(data || '{}')
    } catch {
      return {}
    }
  }

  write(obj) {
    fs.writeFileSync(this.filename, JSON.stringify(obj, null, 2))
  }
}

class Low {
  constructor(adapter) {
    this.adapter = adapter
    this.data = this.adapter.read()
  }

  read() {
    this.data = this.adapter.read()
  }

  write() {
    this.adapter.write(this.data)
  }
}

module.exports = { Low, JSONFile }
