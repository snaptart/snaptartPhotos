# Trip photographs

**Put each station's photographs in its own folder here:**

```
assets/photos/Cucuron/
assets/photos/Eze-sur-Mer/
assets/photos/Noli/
assets/photos/Marseille/
assets/photos/Lyon/
```

Every picture in a folder belongs to that station, however far away it was taken, so day
trips are fine. The folder names are set by `folder` for each station in
`src/data/places.ts`; change them there if you rename a folder. Plain names without
accents are safest.

The list of photographs is rebuilt automatically before `npm start` and `npm run web`. To
rebuild it on its own and see a report:

```
npm run photos
```

## Order and thumbnail

```
npm run arrange
```

This opens a page in your browser with every station's photographs. Drag them into order,
tick **Thumbnail** on the picture you want in the station list, and press **Save**. A
running app picks the change up straight away.

Your choices are saved in `arrangement.json` in this folder. Photographs you add later go
after the arranged ones, oldest first, until you arrange them. Stations you haven't
arranged are shown oldest first, and their first photograph is the thumbnail.

## Titles and captions

The app reads the **title** and **caption** stored inside each photograph, as written by your
photo software:

- **Title** — the IPTC *Object Name* field (also called Title or Headline in some programs).
  Shown at the top of the full-screen viewer, and in small capitals under the journal photo.
- **Caption** — the *Image Description* field (also called Caption or Description). Shown along
  the bottom of the full-screen viewer, two lines at a time; tap it to read the rest.

A photograph without them simply shows neither. Edit the text in your photo software, then run
`npm run photos` (or just add or move any file, if the app is running) to pick up the change.

## Loose files

A photograph left at the top of this folder (not in a station folder) is still placed: by
the GPS position your phone saved in it, if it's within 75 km of a station, or else by a
station name in the file name (`noli-harbour.jpg`). Moving it into a folder is simpler.

The five `replace me` placeholders (`cucuron.jpg` etc.) are only shown for a station that
has no other photographs. Delete them once you've added your own.

## Notes

- **iPhone `.heic` files** can't be shown directly; convert them to JPEG first. On Windows:
  open the file in Photos, then `...` → Save as → JPG. The report lists any it finds.
- **Landscape** shots suit the frame best — it crops to 4:3 from the centre.
- Around **1600 px wide is plenty**. Every photograph is bundled into the app, so many
  full-size camera files make it slow to load on a phone.
- Photographs are shown in their true colours everywhere in the app.
