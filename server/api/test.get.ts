export default defineEventHandler(async (_event) => {
  return {
    success: true,
    message: 'API 運作正常',
    data: [
      {
        id: '1',
        name: '測試活動',
        description: '這是一個測試活動',
        status: 'active',
        qualityScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        location: {
          id: '1',
          activityId: '1',
          address: '台北市信義區',
          city: '台北市',
          region: 'north',
          latitude: 25.033,
          longitude: 121.5654,
          landmarks: [],
        },
        categories: [
          {
            id: '1',
            name: '文化藝術',
            slug: 'culture',
            colorCode: '#ff6b6b',
            icon: '🎨',
          },
        ],
      },
    ],
  };
});
