using HelpDesk.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HelpDesk.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
}
