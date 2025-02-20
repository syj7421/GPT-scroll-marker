window.qs = function (selector, root = document) {
  return root.querySelector(selector);
};

window.qsa = function (selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
};
