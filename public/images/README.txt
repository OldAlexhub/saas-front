Please copy the Play Store badge used by the driver mobile app into this folder so the web frontend can reference it at runtime.

Source path in this repository:
  driverapp/assets/images/playstore.png

Target path for the client public folder:
  client/public/images/playstore.png

Why manual copy?
- The repository tools available here do not allow moving or embedding binary image files directly via the editor.

How to copy on Windows (bash):

```bash
# from the repo root
cp driverapp/assets/images/playstore.png client/public/images/playstore.png
```

After copying, restart the dev server if it's running:

```bash
cd client
npm start
```
