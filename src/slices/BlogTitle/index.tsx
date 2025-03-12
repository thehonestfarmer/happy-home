import { FC } from "react";
import { Content } from "@prismicio/client";
import { SliceComponentProps } from "@prismicio/react";

/**
 * Props for `BlogTitle`.
 */
export type BlogTitleProps = SliceComponentProps<Content.BlogTitleSlice>;

/**
 * Component for "BlogTitle" Slices.
 */
const BlogTitle: FC<BlogTitleProps> = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      Placeholder component for blog_title (variation: {slice.variation}) Slices
    </section>
  );
};

export default BlogTitle;
