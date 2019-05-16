const fs = require('fs');
const path = require('path');

let correctTeachers = [];

function input() {
    let fileLocation = process.argv[2];
    let inputs;
    if (fs.existsSync(fileLocation) && path.extname(fileLocation) === '.json') {
        inputs = getInputViaJson(fileLocation);
    }
    return inputs;

    function getInputViaJson(file) {
        return require(file);
    }
}

function getWhoopsies(json) {
    return json.filter(jsonObject => {
        let correctTeacherCount = 0;
        jsonObject.teachers.forEach(teacher => {
            if (teacher.status === 'Correct Enrollment') {
                correctTeacherCount++;
                if (!correctTeachers.includes(teacher.id)) {
                    correctTeachers.push(teacher.id);
                }
            }
        });
        return correctTeacherCount > 1;
    });
}

function writeReport(data) {
    fs.writeFileSync('./whoopsieReport.json', JSON.stringify(data));
}


// Start Here
let json = input();
let data = getWhoopsies(json);
writeReport(data);