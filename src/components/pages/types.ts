export interface PostSummary {
  id: string;
  data: {
    title: string;
    date: Date;
    tags?: string[];
  };
}
