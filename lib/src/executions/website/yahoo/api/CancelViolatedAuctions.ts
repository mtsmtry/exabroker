import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import { cancelAuction } from "./CancelAuction";
import { getSession } from "./GetSession";

export function cancelViolatedAuctions() {
    return Execution.transaction("Amazon", getCurrentFilename())
        .then(val => DBExecution.yahoo(rep => rep.getNoticesNotEndedByType("vrep")))
        .then(val => Execution.sequence(val, 3)
            .element(notice => Execution.transaction()
                .then(val => getSession(notice.username))
                .then(session => cancelAuction(session, notice.aid)))
        );
}