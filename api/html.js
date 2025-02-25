/* Returns reconstructed HTML for a given Notion doc */

const katex = require("katex")
const prism = require("prismjs")
require("prismjs/components/prism-markup-templating")
require("prismjs/components/prism-php")
require("prismjs/components/prism-python")
require("prismjs/components/prism-ruby")
require("prismjs/components/prism-json")
require("prismjs/components/prism-java")
require("prismjs/components/prism-yaml")
require("prismjs/components/prism-bash")

const call = require("../notion/call")
const normalizeId = require("../notion/normalizeId")
const textArrayToHtml = require("../notion/textArrayToHtml.js")

module.exports = async (req, res) => {
  const { id:queryId } = req.query
  const id = normalizeId(queryId)

  if(!id) {
    return res.json({
      error: "no Notion doc ID provided as `id` parameter"
    })
  }

  const overview = await call("getRecordValues", {
    requests: [
      {
        id,
        table: "block"
      }
    ]
  })

  if(!overview.results[0].value) {
    return res.json({
      error: "could not read Notion doc with this ID - make sure public access is enabled"
    })
  }

  const contentIds = overview.results[0].value.content

  if(!contentIds) {
    return res.json({
      error: "this doc has no content"
    })
  }

  const contents = []

  const chunk = await call("loadPageChunk", {
    pageId: id,
    limit: 999999,
    cursor: {
      stack: []
    },
    chunkNumber: 0,
    verticalColumns: false
  })

  contentIds.forEach(id => {
    const block = chunk.recordMap.block[id]
    if(block) contents.push(block.value)
  })

  const html = []

  let pageHasEquations = false

  contents.forEach(block => {
    const type = block.type

    if(["header", "sub_header", "sub_sub_header", "text"].includes(type)) {
      /* Headers (H1 - H3) and plain text */
      const el = {
        header: "h1",
        sub_header: "h2",
        sub_sub_header: "h3",
        text: "p"
      }[type]

      if(!block.properties) {
        // This is an empty text block. 
        return
      }

      html.push(`<${el}>${textArrayToHtml(block.properties.title)}</${el}>`)
    } else if(["numbered_list", "bulleted_list"].includes(type)) {
      /* Numbered and bulleted lists */
      const el = {
        "numbered_list": "ol",
        "bulleted_list": "ul"
      }[type]

      html.push(`<${el}><li>${textArrayToHtml(block.properties && block.properties.title)}</li></${el}>`)
    } else if(["to_do"].includes(type)) {
      /* To do list represented by a list of checkbox inputs */
      const checked = Boolean(block.properties.checked)
      html.push(`<div class="checklist"><label><input type="checkbox" disabled${checked ? " checked" : ""}>${textArrayToHtml(block.properties.title)}</label></div>`)
    } else if(["code"].includes(type)) {
      /* Full code blocks with language */
      const language = block.properties.language[0][0].toLowerCase().replace(/ /g, "")
      const text = block.properties.title || [[""]]

      // Inject unescaped HTML if code block's language is set to LiveScript
      const showLive = language === "livescript"
      if(showLive) {
        html.push(text.map(clip => clip[0]).join("")) // Ignore styling, just take the text
      } else {
        const code = textArrayToHtml(text, { br: false, escape: false })
        let highlighted = code
        try {
          // try/catch because this fails when prism doesn't know the language
          highlighted = prism.highlight(code, prism.languages[language], language)
        } catch{}
        html.push(`<pre><code class="language-${language}">${highlighted}</code></pre>`)
      }
    } else if(["callout"].includes(type)) {
      /* Callout formatted with emoji from emojicdn.elk.sh or just image */
      const icon = block.format.page_icon
      const imageLink = icon.startsWith("http") ? `https://www.notion.so/image/${encodeURIComponent(icon)}` : `https://emojicdn.elk.sh/${icon}`
      const color = block.format.block_color.split("_")[0]
      const isBackground = block.format.block_color.split("_").length > 1
      const text = block.properties.title
      html.push(`<div class="callout${isBackground ? " background" : " color"}-${color}"><img src="${imageLink}"><p>${textArrayToHtml(text)}</p></div>`)
    } else if(["quote"].includes(type)) {
      html.push(`<blockquote>${textArrayToHtml(block.properties.title)}</blockquote>`)
    } else if(["divider"].includes(type)) {
      html.push(`<hr>`)
    } else if(["image"].includes(type)) {
      html.push(`<img src="https://www.notion.so/image/${encodeURIComponent(block.format.display_source)}">`)
    } else if(["equation"].includes(type)) {
      if(!block.properties) {
        // Equation block is empty
        return 
      }
      pageHasEquations = true
      const equation = block.properties.title[0][0]
      const equationHtml = katex.renderToString(equation, { throwOnError: false })
      html.push(`<div class="equation">${equationHtml}</div>`)
    } else if(["embed"].includes(type)) {
      html.push(`<iframe src=${block.properties.source[0][0]}></iframe>`)
    } else {
      /* Catch blocks without handler method */
      console.log(`Unhandled block type "${block.type}"`, block)
    }
  })

  if(pageHasEquations) {
    html.push(`<link rel="stylesheet" href="https://unpkg.com/katex@0.11.1/dist/katex.min.css">`)
  }

  const joinedHtml = html.join("")
  const cleanedHtml = joinedHtml
                        .replace(/<\/ol><ol>/g, "")
                        .replace(/<\/ul><ul>/g, "")
                        .replace(/<\/div><div class="checklist">/g, "")
  res.send(cleanedHtml)
}