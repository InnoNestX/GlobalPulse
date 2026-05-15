import { renderAdminUiWithSystemSections } from "./admin-system-sections";

export async function renderAdminUiWithLogEnhancements(): Promise<Response> {
  const response = await renderAdminUiWithSystemSections();
  const html = await response.text();
  return new Response(enhanceLogs(html), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function enhanceLogs(html: string): string {
  if (html.includes("globalpulse-logs-enhance")) return html;
  return html
    .replace("</style>", `${style}\n  </style>`)
    .replace("</body>", `${script}\n</body>`);
}

const style = `
    .logs {
      margin-top: 12px !important;
      padding-top: 2px;
      position: relative;
      z-index: 0;
    }
    #section-logs .section-head {
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }
    .logs-refresh-status {
      min-height: 20px;
      color: var(--muted);
      font-size: 12px;
    }
    #loadLogsButton[disabled] {
      opacity: .68;
      cursor: wait;
    }`;

const script = `<script id="globalpulse-logs-enhance">
(function(){
  function textZh(){ return document.documentElement.lang !== 'en'; }
  function ensureStatus(){
    var head=document.querySelector('#section-logs .section-head');
    if(!head||document.getElementById('logsRefreshStatus')) return;
    var status=document.createElement('span');
    status.id='logsRefreshStatus';
    status.className='logs-refresh-status';
    head.appendChild(status);
  }
  function trimLogs(){
    var list=document.getElementById('logs');
    if(!list) return;
    Array.prototype.slice.call(list.querySelectorAll('.log')).slice(10).forEach(function(node){ node.remove(); });
  }
  function bindButton(){
    var button=document.getElementById('loadLogsButton');
    if(!button||button.dataset.logsEnhanced==='1') return;
    button.dataset.logsEnhanced='1';
    button.addEventListener('click', function(){
      ensureStatus();
      var status=document.getElementById('logsRefreshStatus');
      var oldText=button.textContent;
      button.disabled=true;
      button.textContent=textZh()?'刷新中...':'Refreshing...';
      if(status) status.textContent='';
      setTimeout(function(){
        trimLogs();
        button.disabled=false;
        button.textContent=oldText;
        if(status) status.textContent=textZh()?'已刷新，显示最近 10 条':'Refreshed, showing latest 10';
      }, 900);
    }, true);
  }
  function run(){ ensureStatus(); bindButton(); trimLogs(); }
  document.addEventListener('DOMContentLoaded', run);
  setInterval(run, 1200);
})();
</script>`;
