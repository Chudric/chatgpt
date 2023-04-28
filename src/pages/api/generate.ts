import type { APIRoute } from 'astro'

const apiKey = import.meta.env.OPENAI_API_KEY
const baseUrl = "https://api.writesonic.com/v2/business/content/chatsonic?engine=premium&language=zh"

// HTML 转换为 Markdown 的函数
function htmlToMarkdown(html) {
  let markdown = html
  // 处理换行标签
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n')
  // 处理粗体标签
  markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**')
  // 处理超链接标签
  markdown = markdown.replace(/<span>\[(\d+)\]\s*<a href="(.*?)"[^>]*class='text-purple-1 underline'>(.*?)<\/a><\/span>/gi, (match, index, url, text) => `[${index}][${text}](${url})`)
  // 移除其它 HTML 标签
  markdown = markdown.replace(/<\/?[^>]+(>|$)/g, '')

  return markdown
}

export const post: APIRoute = async (context) => {
  try {
    const body = await context.request.json()
    const { messages } = body
    if (!messages) {
      return new Response(JSON.stringify({
        error: {
          message: 'No input text.',
        },
      }), { status: 400 })
    }
    const input_text = messages[messages.length - 1].content
    const response = await fetch(baseUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      method: 'POST',
      body: JSON.stringify({
        enable_google_results: "true",
        enable_memory: true,
        input_text
      }),
    })

    // 解析响应并提取 "message" 字段
    const responseData = await response.json()
    const messageContent = responseData.message

    // 将 HTML 转换为 Markdown
    const markdownContent = htmlToMarkdown(messageContent)

    // 返回 Markdown 格式的 "message" 字段的值
    return new Response(markdownContent, { status: response.status })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({
      error: {
        code: err.name,
        message: err.message,
      },
    }), { status: 500 })
  }
}
