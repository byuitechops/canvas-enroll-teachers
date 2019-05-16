const fs = require('fs');
const path = require('path');
const asyncLib = require('async');
const canvas = require('canvas-api-wrapper');

function deleteSection(section, callback) {
    let statusCodes = {
        pass: 'Passed',
        fail: 'Failed'
    };
    let sectionObj = {
        sectionId: section.id,
        courseId: section.course_id,
        courseName: section.name
    };
    canvas.delete(`/api/v1/sections/${section.id}`, (err) => {
        if (err) {
            sectionObj.status = statusCodes.fail;
            sectionObj.err = err;
            callback(null, sectionObj);
        } else {
            sectionObj.status = statusCodes.pass;
            callback(null, sectionObj);
        }
    });
}

function readFile() {
    let fileLocation = process.argv[2];
    let data;
    if (fs.existsSync(fileLocation) && path.extname(fileLocation) === '.json') {
        data = getInputViaJson(fileLocation);
    }
    return data;

    function getInputViaJson(file) {
        return require(file);
    }
}

function writeReport(data) {
    fs.writeFileSync('./deleteReport.json', JSON.stringify(data));
    console.log('Report Written');
}

function main() {
    let incorrectSections = readFile();
    asyncLib.mapLimit(incorrectSections, 30, deleteSection, (err, result) => {
        if (err) {
            console.error(err);
            return;
        }
        writeReport(result);
        console.log('Process Complete');
    });
}

// Start Here
main();