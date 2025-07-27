// 清理無效的收藏 localStorage
function clearTourismFavorites() {
  console.log('清理前的收藏:', localStorage.getItem('tourism-favorites'));
  localStorage.removeItem('tourism-favorites');
  console.log('收藏已清理');
  location.reload();
}

// 在瀏覽器控制台執行：clearTourismFavorites()
console.log('要清理收藏，請執行：clearTourismFavorites()');