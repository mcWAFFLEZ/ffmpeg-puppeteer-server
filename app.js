//requirements 
const express = require('express');
const path = require('path');
const fs = require('fs')
const puppeteer = require('puppeteer');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const spawn = require('child_process').spawn;
const crypto = require("crypto");



//essentials
const photoFormat = '.png';
const videoFormat = '.mp4';
const snapshotPath = './temp/screenshot';
const videoSavePath = './assets/';


//routes
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/result', async (req, res, next) => {
    const obj = JSON.parse(JSON.stringify(req.body));
    const url = obj.url;
    const newSnapshotPath = await takeScreenShot(url);
    newVideoName = await createVideo(newSnapshotPath);
    res.redirect(`/download?name=${newVideoName}`);
});

app.get('/download',(req, res, next) => {
    res.download(path.join(__dirname, 'assets', req.query.name), err => {
        fs.unlink(`${videoSavePath}${req.query.name}`, function (err) {
            if (err && err.code == 'ENOENT') {
                // file doens't exist
                console.info("File doesn't exist, won't remove it.");
            } else if (err) {
                // other errors, maybe we don't have enough permission
                console.error("Error occurred while trying to remove video");
            } else {
                console.info(`Video removed successfully`);
            }
        });
    });
});

app.get('/', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


app.listen(3000);

//methods
const takeScreenShot = async (url) => {
    const id = generateId();
    const newSnapshotPath = `${snapshotPath}${id}${photoFormat}`;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    console.log(`Taking snapshot from: ${url}`);
    await page.goto(url);
    await page.screenshot({ path: newSnapshotPath });
    console.log(`Snapshot saved at: ${newSnapshotPath}`);
    await browser.close();
    return newSnapshotPath;
}

//Tried using fluent-ffmpeg, not stable at all.
const createVideo = async (newSnapshotPath) => {
    const id = generateId();
    const fileName = `${id}${videoFormat}`;
    const newVideoPath = `${videoSavePath}${fileName}`;
    return new Promise((resolve, reject) => {
        const args = [
            '-r', '1/10',
            '-i', `${newSnapshotPath}`,
            '-vf', 'fps = 30',
            `${newVideoPath}`
        ];
        var proc = spawn(ffmpegPath, args);

        // proc.stdout.on('data', function (data) {
        //     console.log(data);
        // });

        proc.stderr.setEncoding("utf8")
        proc.stderr.on('data', function (data) {
            console.log(data);
        });

        proc.on('close', function () {
            console.log(`Video created successfully and saved at: ${newVideoPath}`);
            fs.unlink(newSnapshotPath, function (err) {
                if (err && err.code == 'ENOENT') {
                    // file doens't exist
                    console.info("File doesn't exist, won't remove it.");
                    reject();
                } else if (err) {
                    // other errors, maybe we don't have enough permission
                    console.error("Error occurred while trying to remove snapshot");
                    reject();
                } else {
                    console.info(`Snapshot removed successfully`);
                    resolve(fileName);
                }
            });
        });
    });
}

const generateId = () => {
    return crypto.randomBytes(5).toString('hex');
}
