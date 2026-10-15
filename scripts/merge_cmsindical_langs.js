const fs = require('fs');
const path = require('path');

const files = [
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/viewer/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/mainmenu/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/grades/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/user/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/login/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/contentlinks/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/editor/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/comments/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/block/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/dataprivacy/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/h5p/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/storagemanager/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/report/insights/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/fileuploader/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/truefalse/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/shortanswer/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/search/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/course/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/reminders/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/reportbuilder/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/ordering/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/numerical/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/rating/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/sitehome/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/multichoice/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/sharedfiles/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/multianswer/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/tag/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/match/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/gapselect/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/question/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/essay/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/settings/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/ddmarker/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/enrol/self/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/calendar/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/enrol/guest/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/courses/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/qtype/ddimageortext/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/core/features/policy/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/coursecompletion/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/blog/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/badges/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/competency/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/notes/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/myoverview/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/calendarmonth/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/timeline/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/messages/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/blogtags/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/blogmenu/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/badges/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/messageoutput/airnotifier/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/activityresults/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/blogrecent/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/privatefiles/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/globalsearch/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/workshop/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/lti/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/notifications/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/activitymodules/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/comments/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/completionstatus/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/learningplans/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/calendarupcoming/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/glossaryrandom/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/workshop/assessment/rubric/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/forum/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/searchforums/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/tags/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/lesson/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/rssclient/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/recentlyaccesseditems/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/starredcourses/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/book/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/recentlyaccessedcourses/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/h5pactivity/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/recentactivity/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/bigbluebuttonbn/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/data/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/survey/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/resource/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/choice/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/data/fields/picture/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/quiz/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/glossary/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/scorm/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/assign/submission/onlinetext/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/data/fields/file/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/assign/submission/file/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/workshop/assessment/accumulative/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/assign/submission/comments/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/workshop/assessment/comments/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/privatefiles/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/wiki/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/assign/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/assign/feedback/file/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/assign/feedback/comments/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/assign/feedback/editpdf/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/url/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/onlineusers/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/block/newsitems/lang.json',
  'c:/Users/juan.vazquez/CMSindical-MoodleApp/src/addons/mod/page/lang.json'
];

const outPath = path.resolve(__dirname, '..', 'src', 'assets', 'lang', 'es.json');
const backupPath = outPath + '.bak.' + Date.now();

let merged = {};
files.forEach(f => {
  try {
    if (!fs.existsSync(f)) {
      console.warn('Missing file', f);
      return;
    }
    const content = fs.readFileSync(f, 'utf8');
    const obj = JSON.parse(content);
    merged = Object.assign(merged, obj);
  } catch (e) {
    console.error('Error reading or parsing', f, e.message);
  }
});

// Ensure output dir exists
const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Backup existing
if (fs.existsSync(outPath)) {
  fs.copyFileSync(outPath, backupPath);
  console.log('Backed up existing es.json to', backupPath);
}

fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
console.log('Wrote merged es.json with', Object.keys(merged).length, 'keys to', outPath);
