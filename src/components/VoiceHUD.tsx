import IncomingCall from "./IncomingCall";
import ActiveCall from "./ActiveCall";
import CallTray from "./CallTray";
import { useVoice } from "../store/voice";

export default function VoiceHUD() {
    const { ringing, incoming, active, connecting, pc, local, remote, hasVideo } = useVoice();

    const hasCallContext = !!(pc || local || remote || active || connecting);

    const showActive = hasCallContext;
    const showIncoming = !!(ringing && incoming && !hasCallContext);

    const ActiveComponent = hasVideo ? ActiveCall : CallTray;

    return (
        <>
            {showActive && <ActiveComponent />}
            {showIncoming && <IncomingCall />}
        </>
    );
}
