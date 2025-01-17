import AddonModule from "./module";

class Setting extends AddonModule {
  public Zotero: _ZoteroConstructable
  public window: Window
  public document: Document

  public settingNode: HTMLElement
  public inputNode: HTMLInputElement
  public historyNode: any
  public keyset: XUL.Element

  public setValue: any
  public getValue: any

  public maxlineNodeNum = 12 // because the scroll in Zotero is too ugly
  public tipText = "Enter your command here..."
  public DOIData = {}
  public History = {
    k: "Zotero.ZoteroStyle.settingHistory",
    permanentSettingHistory: [
      "Zotero.ZoteroStyle.progressOpacity=.7",
      "Zotero.ZoteroStyle.tagSize=5",
      "Zotero.ZoteroStyle.tagPosition=3",
      "Zotero.ZoteroStyle.tagAlign=left",
      "Zotero.ZoteroStyle.progressColor=#5AC1BD",
      "Zotero.ZoteroStyle.constantFields=['hasAttachment', 'title']"
    ],
    render() {
      let allText = this.readAll()
      this.historyNode.querySelectorAll(".line").forEach(e=>{
        let innerText = e.innerText
        if (allText.includes(innerText)) {
          allText = allText.filter(text=>text!=innerText)
        } else {
          e.remove()
        }
      })
      this.renderArray(allText)
    },
    push(text) {
      console.log(`push - ${text}`)
      let arr = this.readAll()
      console.log('before', arr)
      arr.push(text)
      this.setValue(this.k, arr) 
      console.log('after', this.readAll())
    },
    readAll() {
      return this.getValue(this.k, this.permanentSettingHistory)
    },
    remove(text) {
      console.log(`remove - ${text}`)
      let arr = this.readAll().filter(_text=>_text!=text)
      this.setValue(this.k, arr)
      console.log(arr)
    },
    removeStartsWidth(text) {
      console.log(`removeStartsWidth - ${text} `)
      console.log('before', this.readAll())
      this.setValue(this.k, this.readAll().filter(_text=>!_text.startsWith(text)))
      console.log('after', this.readAll())

    }
  }

  constructor(parent) {
    super(parent)
  }

  public init(Zotero: _ZoteroConstructable) {
      this.Zotero = Zotero;
      this.window = this.Zotero.getMainWindow();
      this.document = this.window.document;
      console.log(this.History)
      Object.assign(this.History, this, 
        {
          getValue: this.getValue, 
          setValue: this.setValue, 
          createElement: this.createElement, 
          renderArray: this.renderArray
        }
      )
      this.createStyle()
      this.createHTML()
      this.setEvent()
      this.initKeys()
  }

  public createStyle() {
    console.log("add style for setting")
    let styleText = `
      #Zotero-Style-Setting {
        ---radius---: 10px;
        position: fixed;
        left: 30%;
        bottom: 10%;
        width: 40%;
        border-radius: var(---radius---);
        border: 1px solid black;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: white;
        font-size: 18px;
        box-shadow: 0.3em 0.3em 1em rgba(0, 0, 0, 0.3);
      }
      #Zotero-Style-Setting .input-box {
        width: 100%;
        padding-left: 20px;
      }
      #Zotero-Style-Setting input {
          width: 90%;
          height: 45px;
          border: 1px solid red;
          border: none;
          outline: none;
          border-radius: 5px;
          font-size: 20px;
          margin-left: .3em;
      }
      #Zotero-Style-Setting .history {
          width: 100%;
          margin-top: 0;
          padding: 0;
          background-color: rgba(248, 240, 240, .4);
          max-height: 600px;
          overflow-y: hidden;
      }
      #Zotero-Style-Setting .history .line {
          list-style-type: none;
          width: calc(100% - 40px);
          line-height: 2.5em;
          padding: auto 10px;
          display: inline-block;
          padding-left: 20px;
          padding-right: 20px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }
      #Zotero-Style-Setting .history .line:active {
          background-color: rgba(220, 240, 240, 1);;
      }
      #Zotero-Style-Setting .history .line[selected] {
          background-color: rgba(220, 240, 240, 1);
      }
      #Zotero-Style-Setting .history .line:first-child {
          border-radius: var(---radius---) var(---radius---) 0 0;
      }
    `
    let style = this.createElement("style")
    style.setAttribute('type', 'text/css')
    style.setAttribute('id', 'settingStyle')
    style.innerHTML = styleText
    this.document.querySelector('#main-window').appendChild(style)
  }

  public createHTML() {
    console.log("create element for setting")
    // root node
    let settingNode = this.createElement("div")
    settingNode.style.zIndex = "999"
    settingNode.setAttribute("id", "Zotero-Style-Setting")
    // for viewing history or results
    let historyNode = this.createElement("ul")
    historyNode.classList.add("history")
    historyNode.classList.add("view")
    historyNode.style.display = "none"
    settingNode.appendChild(historyNode)
    // for entering text or accepting keycode
    let inputbox = this.createElement("div")
    inputbox.setAttribute("class", "input-box")
    let span = this.createElement("span")
    span.innerText = "</>"
    inputbox.appendChild(span)
    let inputNode = this.window.document.createElement("input")
    inputNode.setAttribute("placeholder", this.tipText)
    inputbox.appendChild(inputNode)
    // append
    settingNode.appendChild(inputbox)
    this.document.querySelector('#main-window').appendChild(settingNode)
    this.settingNode = settingNode
    this.inputNode = inputNode
    this.historyNode = historyNode
    Object.assign(this.History, {inputNode, historyNode})
    this.History.render()
  }

  public async appendLine(text: string) {
    // search
    console.log(this.historyNode.classList)
    if (
      [...this.historyNode.classList].filter(t=>t.startsWith("/")).length != 0
    ) {
      let searchText = this.inputNode.value
      // search some 
      let keywords = searchText.split(/[ ,-]/)
      this.historyNode.classList.add("search-result")
      let totalNum = 0
      this.historyNode.querySelectorAll(".line").forEach(line=>{
        let isAllIn = true
        for (let i=0;i<keywords.length;i++) {
          isAllIn = isAllIn && line.innerText.includes(keywords[i].trim()) 
        }
        if (isAllIn) {
          line.style.display = ""
          this.historyNode.insertBefore(line, this.historyNode.childNodes[0])
          totalNum ++
        } else {
          line.style.display = "none"
          line.removeAttribute("selected")
        }
      })
      this.inputMessage(`get ${totalNum} resluts`, 2)
      return
    }
    if (!this.execLine(text)) { return false }
    if (text.includes("=")) {
      this.History.removeStartsWidth(text.split("=")[0].trim())
    } else {
      this.History.remove(text)
    }
    this.History.push(text)
    console.log("----", this.History.readAll())
    this.History.render()
    this.selectLastLineNode()
    return true
    
  }

  public execLine(text: string) {
    console.log(`try to execute - ${text}`)
    if (text.includes("=")) {
      let [key, value] = text.split("=")
      this.setValue(key.trim(), value.trim())
      console.log(`execute - setValue(${key}, ${value})`)
      this.Zotero.ZoteroStyle.events.refresh()
      this.inputNode.value = ""
      this.inputMessage("Refresh", 2)
      this.inputMessage("Finished", 1, 1)
      return true
    } else if (text.startsWith("/")) {
      // some advanced command here, TODO
      text = text.slice(1)
      if (text == "reference") {
        let reader = this.Zotero.ZoteroStyle.events.getReader()
        if (!reader) {
          console.log("no reader")
          this.inputMessage(`Please select your reader: /${text}`)
          return false
        }
        // find all doi
        const host = "https://doi.org/"
        this.historyNode.querySelectorAll(".line").forEach(e=>e.remove())
        reader._iframeWindow.document.querySelectorAll(`a[href^='${host}']`).forEach(async node=>{
          let DOI = node.getAttribute("href").replace(host, "")
          let text = (await this.getDOIInfo(DOI))
          if (!text) { return } 
          let lineNode = this.createElement("li")
          lineNode.setAttribute("class", "line")
          lineNode.setAttribute("data", DOI)
          lineNode.innerText = text
          this.historyNode.appendChild(lineNode)
        })
        // view in historyNode
        console.log("clear the line in historyNode, prepare for references...")
        this.inputMessage("Searching, please wait for me...", 0)
        this.inputMessage("Please enter the search text, i.e., Polygon 2022", 0, 1)
        let id = this.window.setInterval(() => {
          if (this.historyNode.querySelectorAll(".line").length==0) return
          this.window.clearInterval(id)
          this.historyNode.style.display = ""
          this.historyNode.classList.add("/reference")
          this.selectLastLineNode()
        }, 1e3)
      }
    } else if (this.getValue(text)) {
      let v = this.getValue(text)
      console.log(`Prefs return - ${v}`)
      this.inputNode.value = v
      return true
    } else {
      this.inputMessage(`Not Support: ${text}`)
      return false
    }
  }
  
  public setEvent() {
    this.settingNode.addEventListener("keyup", async (event) => {
        if (event.key=="ArrowUp") {
            // 如果没显示history
            if (this.historyNode.style.display=="none") {
              let lastLine = this.historyNode.querySelector(".line:last-child")
              if (lastLine) {
                // 让他显示，并默认选择第一个
                this.historyNode.style.display = ""
                this.historyNode.querySelectorAll(".line").forEach(line=>line.removeAttribute("selected"))
                lastLine.setAttribute("selected", "")
                return 
              } else {
                this.inputMessage("settingHistory is empty")
              }
            }
        } else if (event.key=="Enter") {
            // 回车则获取当前selected，填入input
            if (this.historyNode.style.display != "none" && this.inputNode.value.trim() == "") {
              // line -> input
              let selectedLine = this.historyNode.querySelector(".line[selected]")
              let text
              if (selectedLine.hasAttribute("data")) {
                text = selectedLine.getAttribute("data")
              } else {
                text = selectedLine.innerText
              }
              this.inputNode.value = text
              // 并且收起historyNode
              this.historyNode.style.display = "none"
            } else {
              // input -> line
              if ((await this.appendLine(this.inputNode.value))) {
                this.historyNode.style.display = ""
              }
            }
        } else if (event.key=="Escape") {
          if (this.historyNode.style.display != "none") {
            this.historyNode.style.display = "none"
          } else {
            this.settingNode.style.display = "none"
          }
        } else if (event.key=="Delete") {
          if (this.historyNode.style.display != "none") {
            // 删除选中
            let lines = this.historyNode.querySelectorAll(".line")
            for (let i=0;i<lines.length;i++) {
              if (lines[i].hasAttribute("selected")) {
                lines[i].remove()
                this.History.remove(lines[i].innerText)
                lines[i+1<lines.length ? i+1 : (lines.length-1 == i ? 0 : lines.length-1)].setAttribute("selected", "")
                // 删除后没有line
                if (this.historyNode.childNodes.length == 0) {
                  this.settingNode.style.display = "none"
                }
                break
              }
            }
          }
        }
        // arrow up down, select 
        if (["ArrowUp", "ArrowDown"].indexOf(event.key) != -1) {
            let lineNodes
            if (this.historyNode.classList.contains("search-result")) {
              lineNodes = [...this.historyNode.querySelectorAll(".line")]
                .filter(e=>e.style.display != "none")
              if (!this.historyNode.querySelector(".line[selected]")) {
                  // select the first
                  lineNodes.slice(-1)[0].setAttribute("selected", "")
                  return
                }
            } else {
              lineNodes = this.historyNode.childNodes
            }
            let lineNodeNum = lineNodes.length
            for (let i=0;i<lineNodes.length;i++){
                if (lineNodes[i].hasAttribute("selected")) {
                  lineNodes[i].removeAttribute("selected")
                    if (event.key=="ArrowUp") {
                        i -= 1
                    } else if (event.key=="ArrowDown") {
                        i += 1
                    }
                    if (i==-1) {
                        i = lineNodes.length - 1
                    }
                    if (i==lineNodes.length) {
                        i = 0
                    }
                    lineNodes[i].setAttribute("selected", "")
                    if (this.historyNode.classList.contains("search-result")) { break }
                    const half = this.maxlineNodeNum / 2
                    for (let j=0;j<lineNodeNum;j++) {
                      if (
                        (j > i ? j - i : i - j) <= half || 
                        (i <= this.maxlineNodeNum && j <= this.maxlineNodeNum) || 
                        (lineNodeNum - i <= this.maxlineNodeNum && lineNodeNum - j <= this.maxlineNodeNum)
                      ) {
                        lineNodes[j].style.display = ""
                      } else {
                        lineNodes[j].style.display = "none"
                      }
                      lineNodes[j].removeAttribute("selected")
                    }
                    break
                }
            }
        }
    })
  }

  public selectLastLineNode() {
    this.historyNode.querySelectorAll(".line").forEach(e=>e.removeAttribute("selected"))
    this.historyNode.querySelector(".line:last-child").setAttribute("selected", "")
  }

  public renderArray(arr) {
    arr.forEach(text=>{
      let lineNode = this.createElement("li")
      lineNode.setAttribute("class", "line")
      lineNode.innerText = text
      this.historyNode.appendChild(lineNode)
    })
    let lineNodes = this.historyNode.childNodes
    let lineNodeNum = lineNodes.length
    if (lineNodeNum > this.maxlineNodeNum) {
      for (let i=0;i<lineNodeNum-this.maxlineNodeNum;i++) {
        lineNodes[i].style.display = "none"
      }
    }
  }

  public inputMessage(msg, persist: number = 1, latency: number = 0) {
    this.window.setTimeout(() => {
      if (this.settingNode.style.display == "none") {
        this.settingNode.style.display = ""
      }
      this.inputNode.value = ""
      this.inputNode.setAttribute("placeholder", msg)
      if (persist) {
        this.window.setTimeout(()=>{
          this.inputNode.setAttribute("placeholder", this.tipText)
        }, persist * 1e3)
      }
    }, latency * 1e3)
  }

  private removeKeys() {
    if (this.keyset) {
      this.keyset.remove()
    }
  }

  private initKeys() {
    this.removeKeys()
    let keyset = this.document.createElement("keyset");
    keyset.setAttribute("id", "zoterostyle-keyset");

    let key = this.document.createElement("key");
    key.setAttribute("id", "zoterostyle-key");
    key.setAttribute("oncommand", "console.log(111)");
    key.addEventListener("command", function () {
      var _Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
        Components.interfaces.nsISupports
      ).wrappedJSObject;
      let document = _Zotero.getMainWindow().document
      let settingNode = document.querySelector("#Zotero-Style-Setting")
      if (settingNode.style.display == "none") {
        settingNode.style.display = ""
        settingNode.querySelector("input").focus()
      } else {
        settingNode.style.display = "none"
      }
    })
    key.setAttribute("key", "p")
    key.setAttribute("modifiers", "shift")
    keyset.appendChild(key)
    this.keyset = keyset
    this.document.getElementById("mainKeyset").parentNode.appendChild(keyset);
  }

  public async getDOIInfo(DOI) {
    let data
    if (Object.keys(this.DOIData).indexOf(DOI) != -1) { 
      data = this.DOIData[DOI]["title"] 
    } else {
      const unpaywall = `https://api.unpaywall.org/v2/${DOI}?email=zoterostyle@polygon.org`
      let res = await this.Zotero.HTTP.request(
        "GET",
        unpaywall,
        {
          responseType: "json"
        }
      )
      data = res.response
      this.DOIData[DOI] = data
    }
    try {
      let family = data.z_authors[0]["family"]
      let year = data.year
      let title = data.title
      console.log(`${family} et al., ${year} ${title}`)
      return `${family} et al., ${year}. ${title}`
    } catch {
      return false
    }
  }

  public createElement(name) {
    return this.document.createElementNS("http://www.w3.org/1999/xhtml", name)
  }
}

export default Setting;