export interface ScrapboxApiResponse {
  projectName: string;
  skip: number;
  limit: number;
  count: number;
  pages: ScrapboxApiPage[];
}

export interface ScrapboxApiPage {
  id: string;
  title: string;
  image: string | null;
  descriptions: string[];
  updated: number;
  created: number;
  views: number;
  linked: number;
  linesCount: number;
  pin: number;
}
