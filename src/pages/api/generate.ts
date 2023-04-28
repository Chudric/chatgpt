import type { APIRoute } from 'astro'

const apiKey = "fed984c5-d34b-43c3-a18c-045a3f331914"
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

// 声明一个变量来存储历史数据
let history_data = []

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

    // 将历史数据中的最新一条消息作为 ChatSonic 的输入文本
    if (history_data.length > 0) {
      const lastMessage = history_data[history_data.length - 1]
      if (lastMessage.is_sent === false) {
        history_data.push({ is_sent: true, message: input_text })
      }
    } else {
      history_data.push({ is_sent: true, message: input_text })
    }

    const response = await fetch(baseUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      method: 'POST',
      body: JSON.stringify({
        enable_google_results: "true",
        enable_memory: true,
        input_text,
        history_data,
      }),
    })

    // 解析响应并提取 "message" 字段
    const responseData = await response.json()
    const messageContent = responseData.message

    // 将 ChatSonic 的回复添加到历史数据中
    history_data.push({ is_sent: false, message: messageContent })

    // 返回 Markdown 格式的 "message" 字段的值
    const markdownContent = htmlToMarkdown(messageContent)
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
