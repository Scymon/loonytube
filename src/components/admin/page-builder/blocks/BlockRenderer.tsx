import type { Block } from "../types";
import HeroBlock     from "./HeroBlock";
import TextBlock     from "./TextBlock";
import ImageBlock    from "./ImageBlock";
import VideoBlock    from "./VideoBlock";
import CtaBlock      from "./CtaBlock";
import FeaturesBlock from "./FeaturesBlock";
import ColumnsBlock  from "./ColumnsBlock";
import { DividerBlock, SpacerBlock } from "./SimpleBlocks";

export type InlineEditProps = {
  editing?: boolean;
  onEdit?: (field: string, value: string) => void;
};

export default function BlockRenderer({
  block,
  editing = false,
  onEdit,
}: { block: Block } & InlineEditProps) {
  switch (block.type) {
    case "hero":     return <HeroBlock     props={block.props} editing={editing} onEdit={onEdit} />;
    case "text":     return <TextBlock     props={block.props} editing={editing} onEdit={onEdit} />;
    case "image":    return <ImageBlock    props={block.props} />;
    case "video":    return <VideoBlock    props={block.props} />;
    case "cta":      return <CtaBlock      props={block.props} editing={editing} onEdit={onEdit} />;
    case "features": return <FeaturesBlock props={block.props} />;
    case "columns":  return <ColumnsBlock  props={block.props} />;
    case "divider":  return <DividerBlock  props={block.props} />;
    case "spacer":   return <SpacerBlock   props={block.props} />;
    case "group":    return null;
    default:         return null;
  }
}
