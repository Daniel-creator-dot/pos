import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT /api/approvals/[id] - Approve or reject a deletion request
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins or superadmins can perform approvals
    if (session.user.role.name !== "admin" && session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body; // "APPROVE" or "REJECT"

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Invalid action. Must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    // Fetch the request
    const approvalRequest = await prisma.deletionRequest.findUnique({
      where: { id: params.id },
    });

    if (!approvalRequest) {
      return NextResponse.json(
        { error: "Deletion request not found" },
        { status: 404 }
      );
    }

    if (
      session.user.role.name !== "superadmin" &&
      approvalRequest.companyId !== session.user.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (approvalRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    const { resourceType, resourceId } = approvalRequest;

    if (action === "APPROVE") {
      // Execute the actual soft-delete
      await prisma.$transaction(async (tx) => {
        // 1. Soft delete the resource
        if (resourceType === "PRODUCT") {
          await tx.product.update({
            where: { id: resourceId },
            data: {
              isActive: false,
              isPendingDelete: false,
            },
          });
        } else if (resourceType === "CATEGORY") {
          await tx.category.update({
            where: { id: resourceId },
            data: {
              isActive: false,
              isPendingDelete: false,
            },
          });
        } else if (resourceType === "SUPPLIER") {
          await tx.supplier.update({
            where: { id: resourceId },
            data: {
              isActive: false,
              isPendingDelete: false,
            },
          });
        }

        // 2. Mark the request as APPROVED
        await tx.deletionRequest.update({
          where: { id: params.id },
          data: {
            status: "APPROVED",
            approvedById: session.user.id,
          },
        });
      });
    } else {
      // Reject and restore the resource
      await prisma.$transaction(async (tx) => {
        // 1. Restore isPendingDelete flag to false
        if (resourceType === "PRODUCT") {
          await tx.product.update({
            where: { id: resourceId },
            data: {
              isPendingDelete: false,
            },
          });
        } else if (resourceType === "CATEGORY") {
          await tx.category.update({
            where: { id: resourceId },
            data: {
              isPendingDelete: false,
            },
          });
        } else if (resourceType === "SUPPLIER") {
          await tx.supplier.update({
            where: { id: resourceId },
            data: {
              isPendingDelete: false,
            },
          });
        }

        // 2. Mark the request as REJECTED
        await tx.deletionRequest.update({
          where: { id: params.id },
          data: {
            status: "REJECTED",
            approvedById: session.user.id,
          },
        });
      });
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Approvals Action API Error:", error);
    return NextResponse.json(
      { error: "Failed to process approval action" },
      { status: 500 }
    );
  }
}
