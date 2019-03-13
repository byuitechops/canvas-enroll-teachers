const path = require('path');
const fs = require('fs');
const asyncLib = require('async')

const canvas = require('canvas-api-wrapper');

async function input() {
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

async function core() {
    var goodEnrollments = [];
    var badEnrollments = [];

    function enrollTeacher(courseData, callback) {
        var enrollmentObj = {
            enrollment: {
                user_id: courseData.teacher.id,
                type: 'TeacherEnrollment',
                enrollment_state: 'active',
                notify: false
            }
        };

        canvas.post(`/api/v1/courses/${courseData.course.id}/enrollments`, enrollmentObj, (err, success) => {
            if (err) {
                console.log(err);
                badEnrollments.push({
                    teacher: courseData,
                    err: err,
                    message: 'Error Enrolling'
                });
                callback(null);
                return;
            }
            console.log(`${courseData.course.id} | ${courseData.teacher.name} has been enrolled in their Sandbox course.`);
            goodEnrollments.push({
                teacher: courseData,
                err: err,
                message: 'Successful Enrollment'
            });
            callback(null);
        });
    }

    asyncLib.eachLimit(toEnroll.slice(0), 25, enrollTeacher, (err) => {
        if (err) {
            console.log(err);
            return;
        }
        var date = moment().format('YYYYMMDD_kkmm');
        var output = {
            success: goodEnrollments,
            failure: badEnrollments,
        };

        fs.writeFileSync(`./${date}-Enrollments.json`, JSON.stringify(goodEnrollments, null, 4));

        console.log('Enrollments complete.');
    });
}

async function output(outputs) {
    return;
}

async function main() {
    let inputs = await input();
    let outputs = await core(inputs);
    await output(outputs);
}

main().catch(console.error)