function hh_mm_ss(seconds) {
  let date = new Date(null);
  date.setSeconds(seconds);
  let subday = date.toISOString().slice(11, 19);
  let subday_sec = (subday.slice(0, 2) | 0) * 3600 + (subday.slice(3, 5) | 0) * 60 + (subday.slice(6) | 0);
  let days = (seconds - subday_sec) / (24 * 3600);
  if (days > 0) {
    days = `${days}d `;
  } else {
    days = "";
  }
  return `${days}${subday}`;
}

function insertPRPipelineTimings(model) {
  if (model.data.length == 0) {
    setTimeout(queryPRTimings, 60000);
    return;
  }
  let stage_timings = model.data[0].stage_timings;
  let deploy_timings = {};
  if (stage_timings["deploy"]) {
    deploy_timings = Object.fromEntries(
      Object.entries(stage_timings["deploy"]).map(
        ([k, v]) => [k, v.slice(0, -1)|0]
      )
    )
    delete stage_timings["deploy"];
  }
  let timings = Object.entries(stage_timings).map(([k, v]) => [k, (v||[]).slice(0, -1)|0]);
  let max = timings.reduce((max, [k, v]) => (max > v? max : v), 0);
  timings = Object.assign({}, ...timings.map(([k, v]) => ({[k]: [v, v / max]})));
  for (let stage of ["review", "merge", "release"]) {
    timings[stage] = timings[stage] || [0, 0];
  }
  max = Object.values(deploy_timings).reduce((max, v) => (max > v? max : v), 0);
  let deploy_bars = Object.entries(deploy_timings).map(([env, time]) => `         <div><span class="text-uppercase">Deploy to ${env}</span></div>
         <div title="${hh_mm_ss(time)}" class="athenian-progress athenian-deploy" style="width: ${(time / max) * 100}%;"></div>`);
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
         <div title="${hh_mm_ss(timings["wip"][0])}" class="athenian-progress athenian-wip"></div>
         <div><span class="text-uppercase">Review</span></div>
         <div title="${hh_mm_ss(timings["review"][0])}" class="athenian-progress athenian-review"></div>
         <div><span class="text-uppercase">Merge</span></div>
         <div title="${hh_mm_ss(timings["merge"][0])}" class="athenian-progress athenian-merge"></div>
         <div><span class="text-uppercase">Release</span></div>
         <div title="${hh_mm_ss(timings["release"][0])}" class="athenian-progress athenian-release"></div>
         ${deploy_bars.join("\n")}
         <style>
           .athenian-progress {
             height: 1em;
           }
           .athenian-progress:not(:last-of-type) {
             margin-bottom: 1em;
           }
           .athenian-wip {
             background-color: rgb(255, 116, 39);
             width: ${timings["wip"][1] * 100}%;
           }
           .athenian-review {
             background-color: rgb(255, 197, 8);
             width: ${timings["review"][1] * 100}%;
           }
           .athenian-merge {
             background-color: rgb(146, 96, 226);
             width: ${timings["merge"][1] * 100}%;
           }
           .athenian-release {
             background-color: rgb(36, 199, 204);
             width: ${timings["release"][1] * 100}%;
           }
           .athenian-deploy {
             background-color: #2fcc71;
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
