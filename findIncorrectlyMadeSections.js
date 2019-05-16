const fs = require('fs');
const path = require('path');
const moment = require('moment');
const asyncLib = require('async');
const canvas = require('canvas-api-wrapper');

let sections = [];
// Get a current semester's courses from Canvas
async function getCoursesByTerm(enrollmentTermId) {
    return await canvas.get(`/api/v1/accounts/1/courses?enrollment_term_id=${enrollmentTermId}`);
}

function getIncorrectSemesterSections(course, callback) {
    canvas.get(`/api/v1/courses/${course.id}/sections`, (err, courseSections) => {
        courseSections.forEach(courseSection => {
            if (filterSemesterSections(courseSection)) {
                sections.push(courseSection);
                console.log('Incorrect Section Added');
            }
        });
        callback(null);
    });
}

function filterSemesterSections(semesterSection) {
    return !semesterSection.sis_section_id;
}

function writeReport() {
    fs.writeFileSync('./incorrectSections.json', JSON.stringify(sections));
    console.log(`Number of incorrect sections: ${sections.length}`);
    console.log('Report Written');
}

async function main() {
    let enrollmentTermId = process.argv[2];
    let termCourses = await getCoursesByTerm(enrollmentTermId);
    asyncLib.eachLimit(termCourses, 30, getIncorrectSemesterSections, (err) => {
        if (err) {
            console.log(err);
            return;
        }
        writeReport();
    });
}

// Start here
main();