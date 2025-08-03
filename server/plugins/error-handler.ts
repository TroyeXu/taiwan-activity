export default defineNitroPlugin((nitroApp) => {
  // 在生產環境中禁用詳細錯誤
  if (process.env.NODE_ENV === 'production') {
    nitroApp.hooks.hook('error', async (error: any, { event }: any) => {
      console.error('Server error:', error)
      // 返回通用錯誤訊息
      if (event?.node?.res) {
        event.node.res.statusCode = error.statusCode || 500
        event.node.res.end(JSON.stringify({
          statusCode: event.node.res.statusCode,
          statusMessage: 'Internal Server Error'
        }))
      }
    })
  }
})