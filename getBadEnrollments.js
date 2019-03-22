const asyncLib = require('async');
const canvas = require('canvas-api-wrapper');
const fs = require('fs');
const path = require('path');
const d3 = require('d3-dsv');

canvas.subdomain = 'byui.beta'; // Comment this when running

const courseStatusCodes = {
    passed: 'Passed',
    failed: 'Failed',
    noTeacherEnrollments: 'No Teacher Enrollments'
};

const teacherStatusCodes = {
    correct: 'Correct Enrollment',
    extra: 'Extra Teacher Enrollment',
    incorrect: 'Incorrect Enrollment'
};

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

function checkEnrollments(courseData, callback) {
    canvas.get(`/api/v1/courses/sis_course_id:C.${courseData.entityCode}/enrollments?role_id=4&per_page=100`, (err, teacherEnrollments) => {
        if (err) {
            console.log(err);
            callback(err);
            return;
        }
        let courseStatusObj = {
            id: courseData.entityCode,
            status: '',
            teachers: []
        };
        if (teacherEnrollments.length > 0) {
            // Find if the correct teacher is enrolled
            let check = teacherEnrollments.some(teacherEnrollment => teacherEnrollment.user.sis_user_id === courseData.userINumber);
            // Set Course and Teacher Status
            if (check) {
                courseStatusObj.status = courseStatusCodes.passed;
                console.log(`${courseData.entityCode} Passed`);
                teacherEnrollments.forEach(teacherEnrollment => {
                    if (teacherEnrollment.user.sis_user_id === courseData.userINumber) {
                        courseStatusObj.teachers.push({
                            id: teacherEnrollment.user.sis_user_id, // INumber
                            status: teacherStatusCodes.correct
                        });

                    } else {
                        courseStatusObj.teachers.push({
                            id: teacherEnrollment.user.sis_user_id, // INumber
                            status: teacherStatusCodes.extra
                        });
                    }
                    if (courseStatusObj.teachers.length > 1) {
                        courseStatusObj.numTeachers = courseStatusObj.teachers.length;
                    }
                });
            } else {
                console.log(`${courseData.entityCode} Failed`);
                courseStatusObj.correctTeacher = courseData.userINumber;
                courseStatusObj.status = courseStatusCodes.failed;
                teacherEnrollments.forEach(teacherEnrollment => {
                    courseStatusObj.teachers.push({
                        enrollmentId: teacherEnrollment.id,
                        id: teacherEnrollment.user.sis_user_id, // INumber
                        status: teacherStatusCodes.incorrect
                    });
                });
            }
        } else {
            console.log(`${courseData.entityCode} has no teacher enrollments`);
            courseStatusObj.status = courseStatusCodes.noTeacherEnrollments;
            courseStatusObj.correctTeacher = courseData.userINumber;
        }
        callback(null, courseStatusObj);
    });
}

function getEnrollmentStatus(courseData, callback) {
    asyncLib.mapLimit(courseData, 25, checkEnrollments, (err, enrollmentStatus) => {
        if (err) {
            callback(err);
        } else {
            callback(null, enrollmentStatus);
        }
    });
}

function writeJSONReport(filepath, json) {
    fs.writeFileSync(filepath, json);
    console.log('JSON Report Written');
}

function writeCSVReport(filepath, enrollmentStatus) {
    let csvEnrollmentData = enrollmentStatus.map(enrollmentObj => {
        return {
            id: enrollmentObj.id,
            courseStatus: enrollmentObj.status,
            hasCorrectTeacher: enrollmentObj.status === 'Passed',
            hasExtraTeachers: enrollmentObj.teachers.length > 1,
            hasNoTeachers: enrollmentObj.status === 'No Teacher Enrollments'
        };
    });
    fs.writeFileSync(filepath, d3.csvFormat(csvEnrollmentData));
    console.log('CSV Report Written');
}

function writeReports(enrollmentStatus) {
    writeJSONReport('./enrollmentReport.json', JSON.stringify(enrollmentStatus));
    writeCSVReport('./enrollmentReport.csv', enrollmentStatus);
    console.log('Reports Written');
}

function main() {
    let courseData = readFile();
    getEnrollmentStatus(courseData, (err, enrollmentStatus) => {
        if (err) {
            console.log(err);
        }
        writeReports(enrollmentStatus);
    });
}

// Start Here
main();