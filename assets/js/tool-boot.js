(function () {
  var params = new URLSearchParams(location.search);
  var id = params.get('id') || '';
  var data = window.TOOLSHED;
  var root = document.querySelector('[data-root]');
  var titleEl = document.querySelector('[data-title]');
  var descEl = document.querySelector('[data-desc]');
  var catEl = document.querySelector('[data-category]');

  var tool = data && data.tools.filter(function (t) { return t.id === id; })[0];
  var impl = window.ToolshedTools.get(id);

  if (!tool || !impl) {
    titleEl.textContent = 'Tool not found';
    descEl.textContent = 'That tool does not exist yet.';
    document.title = 'Tool not found · Toolshed';
    root.textContent = '';
    var a = document.createElement('a');
    a.href = '../index.html#categories';
    a.textContent = 'Back to the wall';
    root.appendChild(a);
    return;
  }

  var cat = data.categories.filter(function (c) { return c.id === tool.category; })[0];
  document.title = tool.name + ' · Toolshed';
  titleEl.textContent = tool.name;
  descEl.textContent = tool.desc + ' Your files never leave your browser.';
  catEl.textContent = cat ? cat.name : '';
  var meta = document.querySelector('meta[name=description]');
  if (meta) meta.setAttribute('content', tool.desc);

  root.textContent = '';
  try {
    impl(root, window.ToolshedTools.kit);
  } catch (e) {
    root.textContent = 'Something went wrong starting this tool.';
    if (window.console) console.error(e);
  }
})();
