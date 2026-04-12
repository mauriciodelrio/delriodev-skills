import { runWizard } from './wizard.js';

runWizard().catch((err) => {
  console.error(err);
  process.exit(1);
});
