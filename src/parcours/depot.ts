import type { ElementProgramme, Programme } from "./types";

// Interface du depot des programmes. Le domaine ne connait que cette interface.
export interface DepotProgrammes {
  creerProgramme(programme: Programme): Promise<void>;
  programmeParId(id: string): Promise<Programme | null>;
  programmes(): Promise<Programme[]>;

  ajouterElement(element: ElementProgramme): Promise<void>;
  elementParId(id: string): Promise<ElementProgramme | null>;
  elementsDuProgramme(programmeId: string): Promise<ElementProgramme[]>; // tries par position
  retirerElement(id: string): Promise<void>;
  majPositions(elements: ElementProgramme[]): Promise<void>;
}
