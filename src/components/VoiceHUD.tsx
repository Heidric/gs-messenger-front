import IncomingCall from "./IncomingCall";
import ActiveCall from "./ActiveCall";
import CallTray from "./CallTray";
import { useVoice } from "../store/voice";

export default function VoiceHUD() {
    const { ringing, incoming, active, connecting, pc, hasVideo } = useVoice();

    const showIncoming = !!(ringing && incoming && !active && !connecting && !pc);
    const showActive = (active || connecting);

    const ActiveComponent = hasVideo ? ActiveCall : CallTray;

    return (
        <>
            {showActive && <ActiveComponent />}
            {showIncoming && <IncomingCall />}
        </>
    );
}
