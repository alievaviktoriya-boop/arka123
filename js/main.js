// Точка входа клиентского JS. Подключается в index.html с defer,
// поэтому DOM к моменту выполнения уже готов.

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});
