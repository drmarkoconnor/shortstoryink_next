# Documents and folders — final PR7 clarity pass

A document contains writing. A folder groups documents. Chapter, Scene, Research, Notes and Text are descriptive document labels, not five incompatible types or levels of hierarchy.

The creation form presents Document / Folder first, followed by Document title and Label, or Folder name. Its buttons are Add document and Create folder. A chaptered starter now contains one editable Chapter 1 document labelled Chapter, not an empty container requiring another item. A chapter made of scenes may instead use a folder named Chapter 1 containing Scene documents. Parts are named grouping folders. Existing projects are not rearranged, converted or renamed.

Labels belong to immutable revisions, so saving, conflict preservation, named snapshots, restore and full-project archives retain them. An older client that changes prose without a label retains the existing label. Applied migrations 001–009 are untouched; 010 adds this metadata and reuses the guarded paragraph/project lifecycle.

Research and Notes are supporting material. The default manuscript read and Compile selection exclude them. Writers can explicitly include them; the Compile form and server both require confirmation before a selected supporting document enters a compiled copy. Compile validates the frozen revision selection on retries. Labels and card synopses do not add themselves to exported prose. The private full-project archive continues to include research and notes.

Local regression suite: 93 tests passed with all earlier tests retained, plus durable labels, conflict/history/restore, chapter starter idempotency, validation/privacy and explicit compile-confirmation tests. Browser rehearsal now exercises the actual creation controls, saving/reloading a research document, default manuscript exclusion, an actual downloaded Word document without the research sentinel, deliberate inclusion and folder creation. Hosted CI, browser and preview results must be inspected on the final commit before merging.

This is a clarity pass within PR7, not a second Projects implementation. It does not extend editor or peer access to working projects, replace group sharing or complete the outstanding independent encrypted backup/restore and real Netlify Identity-authenticated automated save/export gates. Retain early-access separate-copy guidance.
