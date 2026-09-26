"use client";

import type { Overrides } from "@puckeditor/core";
import { draggableOutlinePlugin } from "./DraggableOutline";
import { puckFieldTypes } from "./fieldTypes";
import { PanelFields } from "./PanelFields";
import { ActionBarWithCopy, CopyToPageDrawer } from "./CopyToPage";

/** The one set of Puck overrides every editor (pages, stories, contents) uses. */
export const puckOverrides: Partial<Overrides> = {
  ...draggableOutlinePlugin().overrides,
  fieldTypes: puckFieldTypes,
  fields: PanelFields,
  actionBar: ActionBarWithCopy,
  headerActions: ({ children }) => (
    <>
      {children}
      <CopyToPageDrawer />
    </>
  ),
};
