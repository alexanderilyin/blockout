// Daily check-in: part of the multiplication game (split from the old js/game.js).

import * as Progress from '@blockout/progress';
import { celebrate, progress, renderWallet, saveProgress, toast } from './wallet.js';
import { checkUrlForInvite } from './invites.js';

// What this part does when the page loads (main.js runs every part in order)
export function run() {
  renderWallet();

  {
    const visit = Progress.checkIn(progress);
    if (visit) {
      const streak = visit.streak > 1 ? ` · ${visit.streak} days in a row 🔥` : '';
      toast(`☀️ Daily check-in: +${visit.bonus} points`, `Welcome back!${streak}`);
      celebrate(Progress.awardAchievements(progress, { event: 'checkin', streak: visit.streak }));
      saveProgress();
    }
  }

  checkUrlForInvite();
}
