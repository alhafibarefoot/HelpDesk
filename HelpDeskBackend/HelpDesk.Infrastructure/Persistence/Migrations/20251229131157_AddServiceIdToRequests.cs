using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HelpDesk.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceIdToRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "Requests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Requests_ServiceId",
                table: "Requests",
                column: "ServiceId");

            migrationBuilder.AddForeignKey(
                name: "FK_Requests_Services_ServiceId",
                table: "Requests",
                column: "ServiceId",
                principalTable: "Services",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Requests_Services_ServiceId",
                table: "Requests");

            migrationBuilder.DropIndex(
                name: "IX_Requests_ServiceId",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "Requests");
        }
    }
}
