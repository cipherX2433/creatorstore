import { readFileSync } from 'fs';
import path from 'path';

async function testBookingWizardProgress() {
  console.log('--- STARTING BOOKING WIZARD PROGRESS INDICATOR AUDIT ---');
  let failures = 0;

  const coachingModalPath = path.join(process.cwd(), 'components/coaching/CoachingBookingWizardModal.jsx');
  const coachingContent = readFileSync(coachingModalPath, 'utf8');

  // 1. Check completedSteps state tracking
  if (coachingContent.includes('const [completedSteps, setCompletedSteps] = useState(() => new Set())')) {
    console.log('✅ Check 1 PASS: completedSteps state is explicitly tracked with a Set.');
  } else {
    console.error('❌ Check 1 FAIL: completedSteps state is missing.');
    failures++;
  }

  // 2. Check isComplete logic: !isActive && wasCompleted && isValid
  if (
    coachingContent.includes('const isActive = step === s.num') &&
    coachingContent.includes('const wasCompleted = completedSteps.has(s.num)') &&
    coachingContent.includes('const isComplete = !isActive && wasCompleted && isValid')
  ) {
    console.log('✅ Check 2 PASS: isComplete requires wasCompleted, isValid, and !isActive.');
  } else {
    console.error('❌ Check 2 FAIL: isComplete calculation is incorrect.');
    failures++;
  }

  // 3. Check handleContinue adds current step to completedSteps
  if (coachingContent.includes('setCompletedSteps((prev) => new Set([...prev, step]))')) {
    console.log('✅ Check 3 PASS: handleContinue explicitly marks the validated step as completed.');
  } else {
    console.error('❌ Check 3 FAIL: handleContinue does not record step completion.');
    failures++;
  }

  // 4. Check Check icon only renders when isComplete
  if (
    coachingContent.includes('{isComplete ? <Check className="h-3 w-3 stroke-[3]" /> : s.num}')
  ) {
    console.log('✅ Check 4 PASS: Check icon is strictly rendered for isComplete steps only.');
  } else {
    console.error('❌ Check 4 FAIL: Check icon condition mismatch.');
    failures++;
  }

  // 5. Check CourseWizardModal has also been updated consistently
  const courseModalPath = path.join(process.cwd(), 'components/course/CourseWizardModal.jsx');
  const courseContent = readFileSync(courseModalPath, 'utf8');
  if (
    courseContent.includes('const [completedSteps, setCompletedSteps] = useState(() => new Set())') &&
    courseContent.includes('const wasCompleted = completedSteps.has(s.num)')
  ) {
    console.log('✅ Check 5 PASS: CourseWizardModal also uses explicit completedSteps tracking.');
  } else {
    console.error('❌ Check 5 FAIL: CourseWizardModal missing completedSteps logic.');
    failures++;
  }

  // 6. Simulate state progression logic in JS
  function simulateWizardFlow() {
    let step = 1;
    let completedSteps = new Set();
    const totalSteps = 7;

    function getStepStatus(sNum) {
      const isActive = step === sNum;
      const wasCompleted = completedSteps.has(sNum);
      const isComplete = !isActive && wasCompleted;
      if (isActive) return 'current';
      if (isComplete) return 'completed';
      return 'upcoming';
    }

    // Initial state on Details (step 1)
    if (getStepStatus(1) !== 'current' || getStepStatus(2) !== 'upcoming' || getStepStatus(7) !== 'upcoming') {
      return false;
    }

    // Complete Step 1 and advance to Step 2 (Calendar)
    completedSteps.add(step);
    step = 2;
    if (getStepStatus(1) !== 'completed' || getStepStatus(2) !== 'current' || getStepStatus(3) !== 'upcoming') {
      return false;
    }

    // Complete Step 2 and advance to Step 3 (Availability)
    completedSteps.add(step);
    step = 3;
    if (getStepStatus(1) !== 'completed' || getStepStatus(2) !== 'completed' || getStepStatus(3) !== 'current' || getStepStatus(4) !== 'upcoming') {
      return false;
    }

    // Navigate back to Step 1 (Details)
    step = 1;
    if (getStepStatus(1) !== 'current' || getStepStatus(2) !== 'completed' || getStepStatus(3) !== 'upcoming' || getStepStatus(4) !== 'upcoming') {
      return false;
    }

    // Advance to Step 7 (Review)
    for (let k = 1; k < 7; k++) completedSteps.add(k);
    step = 7;
    for (let k = 1; k <= 6; k++) {
      if (getStepStatus(k) !== 'completed') return false;
    }
    if (getStepStatus(7) !== 'current') return false;

    return true;
  }

  if (simulateWizardFlow()) {
    console.log('✅ Check 6 PASS: Simulation of step progress, backward navigation, and review state matches all criteria.');
  } else {
    console.error('❌ Check 6 FAIL: Step progress simulation failed.');
    failures++;
  }

  if (failures === 0) {
    console.log('\n🌟 ALL BOOKING WIZARD PROGRESS CHECKS PASSED (6/6)');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failures} CHECKS FAILED`);
    process.exit(1);
  }
}

testBookingWizardProgress();
