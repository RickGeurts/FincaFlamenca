import { STRINGS } from "../content/strings.es";
import { Modal } from "./Modal";
import { SoundPanel } from "./SoundPanel";
import { VoicePanel } from "./VoicePanel";
import { SyncPanel } from "./SyncPanel";
import { BackupPanel } from "./BackupPanel";

/**
 * Everything that is a setting rather than something to play with. It moved
 * off the school screen on purpose: the school is only about learning, and
 * cloud sync sitting under the lessons made it look like homework.
 */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-ink-900">{STRINGS.settings} ⚙️</h2>
        <SoundPanel />
        <VoicePanel />
        <SyncPanel />
        <BackupPanel />
      </div>
    </Modal>
  );
}
