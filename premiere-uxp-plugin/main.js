/* global require */

const ppro = require("premierepro");
const uxp = require("uxp");
const fs = uxp.storage.localFileSystem;

const logElement = document.getElementById("log");
document.getElementById("importBtn").addEventListener("click", importMarkersFromJson);
document.getElementById("exportBtn").addEventListener("click", exportMarkersToJson);

function log(message) {
  logElement.textContent = `${new Date().toLocaleTimeString()}  ${message}\n${logElement.textContent}`;
}

async function importMarkersFromJson() {
  try {
    const file = await fs.getFileForOpening({ types: ["json"] });
    if (!file) {
      return;
    }

    const raw = await file.read();
    const payload = JSON.parse(raw);
    const markers = Array.isArray(payload) ? payload : payload?.markers || [];

    if (!markers.length) {
      throw new Error("Selected file has no markers array");
    }

    const { project, sequence } = await getProjectAndSequence();
    const markerCollection = await ppro.Markers.getMarkers(sequence);

    await project.executeTransaction((compoundAction) => {
      for (const marker of markers) {
        const start = ppro.TickTime.createWithSeconds(Number(marker.startSeconds || 0));
        const duration = ppro.TickTime.createWithSeconds(Number(marker.durationSeconds || 0));

        compoundAction.addAction(
          markerCollection.createAddMarkerAction(
            marker.name || "Marker",
            marker.comments || "",
            marker.markerType || "Comment",
            start,
            duration
          )
        );
      }
    }, `Import ${markers.length} markers`);

    log(`Imported ${markers.length} markers.`);
  } catch (error) {
    log(`Import failed: ${error.message}`);
  }
}

async function exportMarkersToJson() {
  try {
    const { sequence } = await getProjectAndSequence();
    const markerCollection = await ppro.Markers.getMarkers(sequence);
    const markerRefs = await markerCollection.getMarkers();

    const markers = [];
    for (const marker of markerRefs) {
      const start = await marker.getStart();
      const duration = await marker.getDuration();
      markers.push({
        name: await marker.getName(),
        comments: await marker.getComments(),
        markerType: await marker.getType(),
        startSeconds: await start.getSeconds(),
        durationSeconds: await duration.getSeconds(),
      });
    }

    const file = await fs.getFileForSaving("premiere-markers.json", { types: ["json"] });
    if (!file) {
      return;
    }

    await file.write(
      JSON.stringify(
        {
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          markers,
        },
        null,
        2
      )
    );

    log(`Exported ${markers.length} markers.`);
  } catch (error) {
    log(`Export failed: ${error.message}`);
  }
}

async function getProjectAndSequence() {
  const project = await ppro.Project.getActiveProject();
  if (!project) {
    throw new Error("No active Premiere project");
  }

  const sequence = await project.getActiveSequence();
  if (!sequence) {
    throw new Error("No active sequence");
  }

  return { project, sequence };
}
