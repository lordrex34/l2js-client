import IMMOClientMutator from "../../../mmocore/IMMOClientMutator";
import GameClient from "../../GameClient";
import ExQuestItemList from "../../incoming/game/ExQuestItemList";
import { GlobalEvents } from "../../../mmocore/EventEmitter";

export default class ExQuestItemListMutator extends IMMOClientMutator<
  GameClient,
  ExQuestItemList
> {
  update(packet: ExQuestItemList): void {
    packet.Items.forEach(i => this.Client.InventoryItems.add(i));
  }
}
