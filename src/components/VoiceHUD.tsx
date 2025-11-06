import IncomingCall from "./IncomingCall";
import ActiveCall from "./ActiveCall";
import { useVoice } from "../store/voice";

export default function VoiceHUD() {
    const { ringing, incoming, active, connecting, pc } = useVoice();

    const showIncoming = !!(ringing && incoming && !active && !connecting && !pc);
    const showActive   = !!(active || connecting);

    return (
        <>
            {showActive && <ActiveCall />}
            {showIncoming && <IncomingCall />}
        </>
    );
}
