function insertPRPipelineTimings(model) {
  if (model.data.length == 0) {
    setTimeout(queryPRTimings, 60000);
    return;
  }
  let timings = Object.entries(model.data[0].stage_timings).map(([k, v]) => [k, (v||[]).slice(0, -1)|0]);
  const sum = timings.reduce((sum, [k, v]) => sum + v, 0);
  timings = Object.assign({}, ...timings.map(([k, v]) => ({[k]: [v, v / sum]})));
  for (let stage of ["review", "merge", "release"]) {
    timings[stage] = timings[stage] || [0, 0];
  }
  sidebar_item = `<div class="discussion-sidebar-item js-discussion-sidebar-item">
      <details class="details-reset details-overlay select-menu hx_rsm" id="athenian">    
        <summary class="discussion-sidebar-heading discussion-sidebar-toggle" aria-label="Delivery Pipeline - Athenian" role="button">
          <div class="d-flex flex-justify-between">
            <div class="text-bold">Delivery pipeline</div>
            <span>Athenian Owl</span>
          </div>
        </summary>
      </details>
      <div class="css-truncate">
         <div><span class="text-uppercase">Work in progress</span></div>
         <div title="${timings["wip"][0]} seconds" class="athenian-progress athenian-wip"></div>
         <div><span class="text-uppercase">Review</span></div>
         <div title="${timings["review"][0]} seconds" class="athenian-progress athenian-review"></div>
         <div><span class="text-uppercase">Merge</span></div>
         <div title="${timings["merge"][0]} seconds" class="athenian-progress athenian-merge"></div>
         <div><span class="text-uppercase">Release</span></div>
         <div title="${timings["release"][0]} seconds" class="athenian-progress athenian-release"></div>
         <style>
           .athenian-progress {
             height: 1em;
           }
           .athenian-progress:not(:last-of-type) {
             margin-bottom: 1em;
           }
           .athenian-wip {
             background-color: #ff7427;
             width: ${timings["wip"][1] * 100}%;
           }
           .athenian-review {
             background-color: #ffc508;
             width: ${timings["review"][1] * 100}%;
           }
           .athenian-merge {
             background-color: #9260e2;
             width: ${timings["merge"][1] * 100}%;
           }
           .athenian-release {
             background-color: #2fcc71;
             width: ${timings["release"][1] * 100}%;
           }
         </style>
      </div>
    </div>`;
  updateSidebar(sidebar_item);
}

function updateSidebar(sidebar_item) {
  const sidebar = document.getElementById("partial-discussion-sidebar");
  if (!sidebar) {
    setTimeout(updateSidebar, 100, sidebar_item);
  } else {
    sidebar.children[5].insertAdjacentHTML('afterend', sidebar_item);
  }
}

function queryPRTimings() {
  const parsedURL = window.location.href.split("/");
  const repo = parsedURL.slice(-5, -2).join("/");
  const prNumber = parsedURL.slice(-1)[0]|0;
  chrome.storage.sync.get(["token"], (result) => {
    const token = result.token;
    const headers = {};
    if (token) {
      headers["X-API-Key"] = token;
    }
    window.fetch("https://api.athenian.co/v1/get/pull_requests", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        account: 1,
        prs: [{
          repository: repo,
          numbers: [prNumber]
        }]
      }),
    }).then(response => response.json())
      .then(insertPRPipelineTimings);
  });
}

queryPRTimings();
