import type {
  Notebook,
  NotebookGroup,
  Person,
  Transaction,
} from "../db/schema";
import { enqueueMutation } from "./syncQueue";
import { setEntityVersion } from "./syncState";
import type { SyncEntityType, SyncEntityPayload, SyncVersion } from "./syncTypes";
