import { ComplaintStatus, IssueType, Prisma } from "@prisma/client";

/** Turn the desk's filter query-string into a Prisma where clause. Shared by the list and CSV export routes. */
export function buildComplaintWhere(searchParams: URLSearchParams): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = {};

  const query = searchParams.get("query")?.trim() || "";
  const statusParam = searchParams.get("status")?.toUpperCase();
  const issueTypeParam = searchParams.get("issueType")?.toUpperCase();
  const assignedToIdParam = searchParams.get("assignedToId");

  if (query) {
    where.OR = [
      { ticketId: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { location: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  if (statusParam && Object.values(ComplaintStatus).includes(statusParam as ComplaintStatus)) {
    where.status = statusParam as ComplaintStatus;
  }

  if (issueTypeParam && Object.values(IssueType).includes(issueTypeParam as IssueType)) {
    where.issueType = issueTypeParam as IssueType;
  }

  if (assignedToIdParam) {
    where.assignedToId = assignedToIdParam === "unassigned" ? null : assignedToIdParam;
  }

  return where;
}
