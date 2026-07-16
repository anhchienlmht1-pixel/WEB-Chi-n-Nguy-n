import type {
  ISeriesApi,
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";

export interface DrawPoint {
  time: Time;
  price: number;
}

abstract class BasePrimitive implements ISeriesPrimitive<Time> {
  protected chart: SeriesAttachedParameter<Time>["chart"] | null = null;
  protected series: ISeriesApi<"Candlestick" | "Line" | "Area" | "Bar", Time> | null = null;
  protected requestUpdate: (() => void) | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this.chart = param.chart;
    this.series = param.series as ISeriesApi<"Candlestick" | "Line" | "Area" | "Bar", Time>;
    this.requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  updateAllViews(): void {}

  protected toXY(p: DrawPoint): { x: number; y: number } | null {
    if (!this.chart || !this.series) return null;
    const x = this.chart.timeScale().timeToCoordinate(p.time);
    const y = this.series.priceToCoordinate(p.price);
    if (x === null || y === null) return null;
    return { x, y };
  }
}

export class TrendLinePrimitive extends BasePrimitive {
  private p1: DrawPoint;
  private p2: DrawPoint;
  private color: string;

  constructor(p1: DrawPoint, p2: DrawPoint, color: string) {
    super();
    this.p1 = p1;
    this.p2 = p2;
    this.color = color;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [
      {
        renderer: (): IPrimitivePaneRenderer => ({
          draw: (target) => {
            const a = this.toXY(this.p1);
            const b = this.toXY(this.p2);
            if (!a || !b) return;
            target.useMediaCoordinateSpace(({ context }) => {
              context.strokeStyle = this.color;
              context.lineWidth = 2;
              context.beginPath();
              context.moveTo(a.x, a.y);
              context.lineTo(b.x, b.y);
              context.stroke();
            });
          },
        }),
      },
    ];
  }
}

export class RectanglePrimitive extends BasePrimitive {
  private p1: DrawPoint;
  private p2: DrawPoint;
  private color: string;

  constructor(p1: DrawPoint, p2: DrawPoint, color: string) {
    super();
    this.p1 = p1;
    this.p2 = p2;
    this.color = color;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [
      {
        renderer: (): IPrimitivePaneRenderer => ({
          draw: (target) => {
            const a = this.toXY(this.p1);
            const b = this.toXY(this.p2);
            if (!a || !b) return;
            target.useMediaCoordinateSpace(({ context }) => {
              const x = Math.min(a.x, b.x);
              const y = Math.min(a.y, b.y);
              const w = Math.abs(b.x - a.x);
              const h = Math.abs(b.y - a.y);
              context.fillStyle = `${this.color}26`;
              context.fillRect(x, y, w, h);
              context.strokeStyle = this.color;
              context.lineWidth = 1.5;
              context.strokeRect(x, y, w, h);
            });
          },
        }),
      },
    ];
  }
}

export class TextPrimitive extends BasePrimitive {
  private point: DrawPoint;
  private text: string;
  private color: string;

  constructor(point: DrawPoint, text: string, color: string) {
    super();
    this.point = point;
    this.text = text;
    this.color = color;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [
      {
        renderer: (): IPrimitivePaneRenderer => ({
          draw: (target) => {
            const a = this.toXY(this.point);
            if (!a) return;
            target.useMediaCoordinateSpace(({ context }) => {
              context.font = "12px system-ui, sans-serif";
              context.fillStyle = this.color;
              context.textBaseline = "bottom";
              context.fillText(this.text, a.x + 4, a.y - 4);
            });
          },
        }),
      },
    ];
  }
}
