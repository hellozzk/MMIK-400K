const examples = {
  bottle: {
    kicker: "MMAD / MVTec AD / BOTTLE",
    title: "Broken rim, clear visual contrast.",
    id: "broken_large / 000",
    query: "assets/bottle-query.png",
    reference: "assets/bottle-reference.png",
    heatmap: "assets/bottle-heatmap.png",
    queryAlt: "Bottle with a broken rim",
    referenceAlt: "Normal bottle retrieved by Image-RAG",
    heatmapAlt: "ADAgent heatmap over the bottle",
    note: "I-RAG used the official eight-candidate set with GMM enabled; the heatmap was generated from the MVTECAD ADAgent checkpoint. This panel shows visual inputs, not a Qwen answer."
  },
  road: {
    kicker: "MMIK-400K / ASPHALT ROAD",
    title: "A crack that crosses the surface.",
    id: "fissure / 001",
    query: "assets/road-query.jpg",
    reference: "assets/road-reference.jpg",
    heatmap: "assets/road-heatmap.png",
    queryAlt: "Asphalt road with a fissure",
    referenceAlt: "Normal asphalt road retrieved by Image-RAG",
    heatmapAlt: "ADAgent heatmap emphasizing the fissure",
    note: "I-RAG selected one normal road image from the query's eight candidates with GMM enabled; the heatmap was generated from the MMIK ADAgent checkpoint. This panel shows visual inputs, not a Qwen answer."
  }
};

const tabs = [...document.querySelectorAll(".case-tab")];
const panel = document.getElementById("case-panel");
const parts = {
  kicker: document.getElementById("case-kicker"),
  title: document.getElementById("case-title"),
  id: document.getElementById("case-id"),
  query: document.getElementById("case-query"),
  reference: document.getElementById("case-reference"),
  heatmap: document.getElementById("case-heatmap"),
  note: document.getElementById("case-note")
};

function selectCase(name, focus = false) {
  const item = examples[name];
  if (!item) return;
  parts.kicker.textContent = item.kicker;
  parts.title.textContent = item.title;
  parts.id.textContent = item.id;
  for (const key of ["query", "reference", "heatmap"]) parts[key].src = item[key];
  parts.query.alt = item.queryAlt;
  parts.reference.alt = item.referenceAlt;
  parts.heatmap.alt = item.heatmapAlt;
  parts.note.textContent = item.note;
  for (const tab of tabs) {
    const active = tab.dataset.case === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) {
      panel.setAttribute("aria-labelledby", tab.id);
      if (focus) tab.focus();
    }
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => selectCase(tab.dataset.case));
  tab.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = tab.dataset.case === "bottle" ? "road" : "bottle";
    selectCase(next, true);
  });
}
